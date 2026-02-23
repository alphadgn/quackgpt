import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { createRemoteJWKSet, jwtVerify } from "https://deno.land/x/jose@v5.2.2/index.ts";

function isAllowedOrigin(origin: string): boolean {
  if (origin === "https://quackgpt.lovable.app") return true;
  if (/^https:\/\/[a-z0-9-]+\.lovableproject\.com$/.test(origin)) return true;
  if (/^https:\/\/id-preview--[a-z0-9-]+\.lovable\.app$/.test(origin)) return true;
  return false;
}

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": isAllowedOrigin(origin) ? origin : "https://quackgpt.lovable.app",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-privy-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

const PRIVY_APP_ID = Deno.env.get("PRIVY_APP_ID") || "";
const PRIVY_JWKS = createRemoteJWKSet(new URL("https://auth.privy.io/api/v1/apps/" + PRIVY_APP_ID + "/jwks.json"));

async function verifyPrivyToken(req: Request): Promise<string | null> {
  const token = req.headers.get("x-privy-token");
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, PRIVY_JWKS, { issuer: "privy.io", audience: PRIVY_APP_ID });
    return (payload.sub as string) || null;
  } catch (e) {
    console.error("Privy JWT verification failed:", e);
    return null;
  }
}

async function isAdmin(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "super_admin")
    .maybeSingle();
  return !!data;
}

// Simple content hash using Web Crypto API
async function hashContent(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// Chunk content into ~500-token segments (approx 2000 chars)
function chunkContent(content: string, maxChunkChars = 2000): string[] {
  const chunks: string[] = [];
  const paragraphs = content.split(/\n\n+/);
  let current = "";

  for (const para of paragraphs) {
    if (current.length + para.length > maxChunkChars && current.length > 0) {
      chunks.push(current.trim());
      current = para;
    } else {
      current += (current ? "\n\n" : "") + para;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length > 0 ? chunks : [content.substring(0, maxChunkChars)];
}

// Generate embedding via Lovable AI
async function generateEmbedding(text: string, apiKey: string): Promise<number[] | null> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are an embedding generator. Given the following text, generate a JSON array of exactly 1536 floating-point numbers between -1 and 1 that represent the semantic embedding of the text. Only output the JSON array, nothing else.",
          },
          { role: "user", content: text.substring(0, 3000) },
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_embedding",
            description: "Return a 1536-dimensional embedding vector",
            parameters: {
              type: "object",
              properties: {
                embedding: {
                  type: "array",
                  items: { type: "number" },
                  description: "1536-dimensional embedding vector",
                },
              },
              required: ["embedding"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "return_embedding" } },
      }),
    });

    if (!response.ok) {
      console.error("Embedding generation failed:", response.status);
      return null;
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) return null;

    const parsed = JSON.parse(toolCall.function.arguments);
    const emb = parsed.embedding;
    if (Array.isArray(emb) && emb.length === 1536) return emb;
    return null;
  } catch (e) {
    console.error("Embedding generation error:", e);
    return null;
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Determine trigger type
    let triggeredBy = "scheduled";
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = await req.json().catch(() => ({}));
      if (body.trigger === "manual") {
        // Verify admin for manual trigger
        const privyUserId = await verifyPrivyToken(req);
        if (!privyUserId || !(await isAdmin(supabase, privyUserId))) {
          return new Response(JSON.stringify({ error: "Admin access required" }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        triggeredBy = "manual";
      }
    }

    if (!FIRECRAWL_API_KEY) {
      return new Response(JSON.stringify({ error: "Scraping service not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create scrape job record
    const { data: job } = await supabase.from("scrape_jobs").insert({
      status: "running",
      triggered_by: triggeredBy,
    }).select("id").single();

    const jobId = job?.id;

    // Load active sources
    const { data: sources } = await supabase
      .from("scrape_sources")
      .select("url, label")
      .eq("is_active", true);

    const urls = sources?.map((s: any) => s.url) || [];
    let sourcesChecked = 0;
    let sourcesUpdated = 0;
    const errors: any[] = [];

    for (const url of urls) {
      sourcesChecked++;
      try {
        // Scrape the URL
        const scrapeResp = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url,
            formats: ["markdown"],
            onlyMainContent: true,
          }),
        });

        if (!scrapeResp.ok) {
          errors.push({ url, error: `HTTP ${scrapeResp.status}` });
          continue;
        }

        const scrapeData = await scrapeResp.json();
        const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";
        if (!markdown || markdown.length < 50) {
          errors.push({ url, error: "Insufficient content" });
          continue;
        }

        const title = scrapeData.data?.metadata?.title || scrapeData.metadata?.title || url;
        const contentHash = await hashContent(markdown);

        // Check if content has changed
        const { data: existing } = await supabase
          .from("indexed_sources")
          .select("id, content_hash, version")
          .eq("source_url", url)
          .eq("is_current", true)
          .eq("chunk_index", 0)
          .maybeSingle();

        if (existing && existing.content_hash === contentHash) {
          // No change — update last_scraped
          await supabase
            .from("indexed_sources")
            .update({ last_scraped: new Date().toISOString() })
            .eq("source_url", url)
            .eq("is_current", true);
          continue;
        }

        // Content changed! Version old content
        const newVersion = (existing?.version || 0) + 1;

        if (existing) {
          await supabase
            .from("indexed_sources")
            .update({ is_current: false, change_detected: true })
            .eq("source_url", url)
            .eq("is_current", true);
        }

        // Chunk and insert new content
        const chunks = chunkContent(markdown);
        for (let i = 0; i < chunks.length; i++) {
          const chunkHash = await hashContent(chunks[i]);
          let embedding: number[] | null = null;

          if (LOVABLE_API_KEY) {
            embedding = await generateEmbedding(chunks[i], LOVABLE_API_KEY);
          }

          await supabase.from("indexed_sources").insert({
            source_url: url,
            title,
            content: chunks[i],
            content_hash: chunkHash,
            version: newVersion,
            reliability_tier: 1,
            chunk_index: i,
            is_current: true,
            change_detected: !!existing,
            embedding: embedding ? `[${embedding.join(",")}]` : null,
          });
        }

        sourcesUpdated++;
        console.log(`[Ingest] ${url}: v${newVersion}, ${chunks.length} chunks`);
      } catch (e) {
        console.error(`[Ingest] Error processing ${url}:`, e);
        errors.push({ url, error: String(e) });
      }
    }

    // Update job record
    if (jobId) {
      await supabase.from("scrape_jobs").update({
        status: "completed",
        sources_checked: sourcesChecked,
        sources_updated: sourcesUpdated,
        errors,
        completed_at: new Date().toISOString(),
      }).eq("id", jobId);
    }

    return new Response(JSON.stringify({
      success: true,
      sourcesChecked,
      sourcesUpdated,
      errors: errors.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Ingest error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
