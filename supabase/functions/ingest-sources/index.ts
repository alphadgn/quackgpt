import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { createRemoteJWKSet, jwtVerify } from "https://deno.land/x/jose@v5.2.2/index.ts";
import {
  KNOWLEDGE_DOMAIN,
  checkUrl,
  sanitizeRetrievedContent,
} from "../_shared/knowledge.ts";

function isAllowedOrigin(origin: string): boolean {
  if (origin === "https://quackgpt.lovable.app") return true;
  if (origin === "https://quackgpt.info") return true;
  if (origin === "https://www.quackgpt.info") return true;
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

async function hashContent(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(content));
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

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

async function generateEmbedding(text: string, apiKey: string): Promise<number[] | null> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
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
                embedding: { type: "array", items: { type: "number" }, description: "1536-dimensional embedding vector" },
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
    return Array.isArray(emb) && emb.length === 1536 ? emb : null;
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

    let triggeredBy = "scheduled";
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = await req.json().catch(() => ({}));
      if (body.trigger === "manual") {
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
      console.error(JSON.stringify({ event: "ingestion_failed", reason: "scraper_not_configured", knowledge_domain: KNOWLEDGE_DOMAIN }));
      return new Response(JSON.stringify({ error: "Scraping service not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: job } = await supabase.from("scrape_jobs").insert({
      status: "running",
      triggered_by: triggeredBy,
    }).select("id").single();
    const jobId = job?.id;

    // ONLY active sources that belong to the Ugly Duck Society knowledge domain.
    const { data: sources } = await supabase
      .from("scrape_sources")
      .select("url, label, source_family")
      .eq("knowledge_domain", KNOWLEDGE_DOMAIN)
      .eq("is_active", true);

    let sourcesChecked = 0;
    let sourcesUpdated = 0;
    let rejectedCount = 0;
    const errors: any[] = [];

    for (const source of sources || []) {
      const check = checkUrl(source.url);
      if (!check.approved) {
        rejectedCount++;
        errors.push({ url: source.url, error: `rejected: ${check.reason}` });
        console.error(JSON.stringify({ event: "source_rejected", url: source.url, reason: check.reason }));
        continue;
      }

      sourcesChecked++;
      const url = source.url;
      const normalizedUrl = check.normalized!;
      const canonicalUrl = check.canonical!;
      const sourceFamily = check.family!;

      try {
        const scrapeResp = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
        });

        if (!scrapeResp.ok) {
          errors.push({ url, error: `HTTP ${scrapeResp.status}` });
          continue;
        }

        const scrapeData = await scrapeResp.json();
        const meta = scrapeData.data?.metadata || scrapeData.metadata || {};

        // Reject redirects that leave the approved source.
        const finalUrl = meta.sourceURL || meta.url || url;
        const finalCheck = checkUrl(finalUrl);
        if (!finalCheck.approved || finalCheck.family !== sourceFamily) {
          rejectedCount++;
          errors.push({ url, error: `redirect to unapproved destination: ${finalUrl}` });
          console.error(JSON.stringify({ event: "redirect_rejected", from: url, to: finalUrl }));
          continue;
        }

        const rawMarkdown = scrapeData.data?.markdown || scrapeData.markdown || "";
        const markdown = sanitizeRetrievedContent(rawMarkdown, 60000);
        if (!markdown || markdown.length < 50) {
          errors.push({ url, error: "Insufficient content" });
          continue;
        }

        const title = meta.title || source.label || canonicalUrl;
        const author = meta.author || meta.ogSiteName || null;
        const publishedAt = meta.publishedTime || meta.modifiedTime || null;
        const retrievedAt = new Date().toISOString();
        const contentHash = await hashContent(markdown);

        // Idempotency: same normalized URL + same content hash => nothing to do.
        const { data: existing } = await supabase
          .from("indexed_sources")
          .select("id, content_hash, version")
          .eq("knowledge_domain", KNOWLEDGE_DOMAIN)
          .eq("normalized_url", normalizedUrl)
          .eq("is_current", true)
          .eq("chunk_index", 0)
          .maybeSingle();

        if (existing && existing.content_hash === contentHash) {
          await supabase
            .from("indexed_sources")
            .update({ last_scraped: retrievedAt, retrieved_at: retrievedAt })
            .eq("knowledge_domain", KNOWLEDGE_DOMAIN)
            .eq("normalized_url", normalizedUrl)
            .eq("is_current", true);
          continue;
        }

        // Content changed: keep the previous version as history, insert a new one.
        const newVersion = (existing?.version || 0) + 1;
        if (existing) {
          await supabase
            .from("indexed_sources")
            .update({ is_current: false, change_detected: true, archived_at: retrievedAt })
            .eq("knowledge_domain", KNOWLEDGE_DOMAIN)
            .eq("normalized_url", normalizedUrl)
            .eq("is_current", true);
        }

        const chunks = chunkContent(markdown);
        for (let i = 0; i < chunks.length; i++) {
          const chunkHash = await hashContent(chunks[i]);
          let embedding: number[] | null = null;
          if (LOVABLE_API_KEY) embedding = await generateEmbedding(chunks[i], LOVABLE_API_KEY);

          const { error: insertErr } = await supabase.from("indexed_sources").insert({
            source_url: url,
            normalized_url: normalizedUrl,
            canonical_url: canonicalUrl,
            source_family: sourceFamily,
            knowledge_domain: KNOWLEDGE_DOMAIN,
            title,
            author,
            source_timestamp: publishedAt,
            retrieved_at: retrievedAt,
            content: chunks[i],
            content_hash: chunkHash,
            version: newVersion,
            reliability_tier: 1,
            chunk_index: i,
            is_current: true,
            change_detected: !!existing,
            embedding: embedding ? `[${embedding.join(",")}]` : null,
          });
          // Duplicate (same domain + url + chunk + version) is ignored: idempotent.
          if (insertErr && !String(insertErr.message).includes("duplicate key")) {
            errors.push({ url, error: insertErr.message });
          }
        }

        sourcesUpdated++;
        console.log(JSON.stringify({
          event: "ingested",
          knowledge_domain: KNOWLEDGE_DOMAIN,
          source_family: sourceFamily,
          canonical_url: canonicalUrl,
          version: newVersion,
          chunks: chunks.length,
        }));
      } catch (e) {
        console.error(JSON.stringify({ event: "ingestion_error", url, error: String(e) }));
        errors.push({ url, error: String(e) });
      }
    }

    if (jobId) {
      await supabase.from("scrape_jobs").update({
        status: "completed",
        sources_checked: sourcesChecked,
        sources_updated: sourcesUpdated,
        errors,
        completed_at: new Date().toISOString(),
      }).eq("id", jobId);
    }

    console.log(JSON.stringify({
      event: "ingestion_run_complete",
      knowledge_domain: KNOWLEDGE_DOMAIN,
      sources_checked: sourcesChecked,
      sources_updated: sourcesUpdated,
      rejected_url_count: rejectedCount,
      ingestion_failures: errors.length,
    }));

    return new Response(JSON.stringify({
      success: true,
      knowledgeDomain: KNOWLEDGE_DOMAIN,
      sourcesChecked,
      sourcesUpdated,
      rejectedCount,
      errors: errors.length,
      errorDetails: errors,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Ingest error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
