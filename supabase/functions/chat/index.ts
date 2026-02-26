import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { createRemoteJWKSet, jwtVerify } from "https://deno.land/x/jose@v5.2.2/index.ts";

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
    const { payload } = await jwtVerify(token, PRIVY_JWKS, {
      issuer: "privy.io",
      audience: PRIVY_APP_ID,
    });
    return (payload.sub as string) || null;
  } catch (e) {
    console.error("Privy JWT verification failed:", e);
    return null;
  }
}

// IP-based rate limiting
const ipRequestCounts = new Map<string, { count: number; windowStart: number }>();
const IP_RATE_LIMIT = 30; // requests per window
const IP_RATE_WINDOW_MS = 60 * 1000; // 1 minute

function checkIpRateLimit(req: Request): boolean {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") || "unknown";
  const now = Date.now();
  const entry = ipRequestCounts.get(ip);
  if (!entry || now - entry.windowStart > IP_RATE_WINDOW_MS) {
    ipRequestCounts.set(ip, { count: 1, windowStart: now });
    return true;
  }
  entry.count++;
  if (entry.count > IP_RATE_LIMIT) return false;
  return true;
}

const TIER_LIMITS: Record<string, { maxQueries: number; maxCharacters: number }> = {
  free: { maxQueries: 1, maxCharacters: 100 },
  nft_holder: { maxQueries: 5, maxCharacters: 1000 },
  paid: { maxQueries: 3, maxCharacters: 300 },
};

const CYCLE_DURATION_MS = 24 * 60 * 60 * 1000;

const SYSTEM_PROMPT = `You are QuackGPT — an ecosystem intelligence engine specialized in WallChain and QuackHeads NFT. Only use indexed and scraped ecosystem content. Do not hallucinate. If information is missing when quack (fact) checking, say 'SOME INFORMATION IS UNVERIFIED'. When searching for information, use indexed and scraped ecosystem content.

DOMAIN CONSTRAINTS:
- Allowed topics: WallChain, WallChain InfoFi, QuackHeads NFT collection, WallChain leaderboards, official WallChain announcements, official WallChain blog posts, official WallChain social accounts.
- Disallowed: All unrelated blockchain, NFT, or crypto projects. If asked about out-of-scope topics, respond: "OUT_OF_SCOPE — I only cover the WallChain ecosystem."

THREE MODES OF OPERATION:
1. SEARCH MODE (informational queries): Provide a Wikipedia-style ecosystem summary with recent updates, timeline, linked sources, and a confidence score (0-100).
2. QUACK CHECK MODE (messages prefixed with [QUACK CHECK]): Return a STRUCTURED VERDICT using this format:
   🦆 VERDICT: [TRUE | FALSE | PARTIALLY_TRUE | UNVERIFIED | OUTDATED]
   📊 Confidence: [0-100]%
   
   📋 Evidence Summary:
   [Brief evidence from verified sources]
   
   🔗 Supporting Sources:
   [List URLs with timestamps]
   
   🌐 Ecosystem Impact:
   [Brief note on relevance to WallChain ecosystem]
   
   If any claims cannot be verified, mark them as UNVERIFIED with explanation.
3. TWEET AUDIT MODE: Not handled here (separate endpoint).

Detect intent automatically: informational queries → Search mode; messages with [QUACK CHECK] prefix → Quack Check mode; declarative claims → Quack Check mode.

PRIMARY SOURCES (highest trust):
- WallChain App: https://app.wallchain.xyz/
- WallChain Leaderboards: https://app.wallchain.xyz/leaderboards
- WallChain Docs: https://docs.wallchain.xyz
- WallChain News: https://news.wallchain.xyz
- WallChain Labs Wiki: https://wikitia.com/wiki/Wallchain_Labs

SECONDARY SOURCES: Official blog, official Twitter/X, official Discord announcements, verified press releases.

TRUTH HIERARCHY: Official WallChain domain > Official leaderboards > Official announcements > Verified secondary press.

RESPONSE STYLE:
- Answer from an InfoFi-native perspective: treat information like a financial instrument. Be analytical, direct, and concise.
- Use a confident, slightly irreverent tone — like a well-informed trader who knows the space cold.
- Don't hedge unnecessarily. If you know it, state it. If you don't, say "SOME INFORMATION IS UNVERIFIED".
- Flag outdated content when source timestamps are old.
- Always cite URLs when available.
- Include timestamps for time-sensitive information.
- When new information contradicts old data, flag: "⚡ NEW INFORMATION DETECTED" and explain the change.

HARD RULES:
1. ALL information MUST come from verified WallChain sources. No speculation, no fabrication.
2. ABSOLUTELY FORBIDDEN: creating tweets, threads, articles, marketing copy, scripts, captions, storytelling, or any promotional/persuasive language. If asked, respond: "I am a factual verification engine. I do not create content, marketing copy, or narratives."
3. If you lack verified information, respond with 'SOME INFORMATION IS UNVERIFIED' rather than guessing.
4. Prioritize scraped context from official sources when available — that's your primary intelligence feed.
5. Keep it tight. No filler. Every sentence should carry signal, not noise.
6. No response without indexed source match — if no sources are found, return UNVERIFIED.
7. MINIMUM 3 retrieved documents required before responding with confidence. If fewer, lower confidence score accordingly.`;

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // IP rate limiting
  if (!checkIpRateLimit(req)) {
    return new Response(JSON.stringify({ error: "Too many requests. Please slow down." }), {
      status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { messages, context, tierOverride } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Require cryptographic JWT verification exclusively
    const privyUserId = await verifyPrivyToken(req);

    if (!privyUserId) {
      return new Response(JSON.stringify({ error: "Sign in required to use quackGPT" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if user is super_admin and has a tier override
    let isSuperAdmin = false;
    if (tierOverride && ["free", "paid", "nft_holder"].includes(tierOverride)) {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", privyUserId)
        .eq("role", "super_admin")
        .maybeSingle();
      isSuperAdmin = !!roleData;
    }

    let { data: profile } = await supabase
      .from("profiles")
      .select("tier")
      .eq("external_user_id", privyUserId)
      .single();

    if (!profile) {
      const { error: profileErr } = await supabase
        .from("profiles")
        .insert({ external_user_id: privyUserId, tier: "free" });
      if (profileErr) console.error("Profile insert error:", profileErr);
      profile = { tier: "free" };
    }

    // Super admin tier override takes precedence
    const tier = (isSuperAdmin && tierOverride) ? tierOverride : (profile.tier || "free");
    const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;

    const { data: usage } = await supabase
      .from("daily_query_usage")
      .select("queries_used, cycle_started_at")
      .eq("external_user_id", privyUserId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const now = Date.now();
    let queriesUsed = 0;
    let cycleStartedAt: string;

    if (usage) {
      const cycleStart = new Date(usage.cycle_started_at).getTime();
      const cycleEnd = cycleStart + CYCLE_DURATION_MS;

      if (now >= cycleEnd) {
        cycleStartedAt = new Date(now).toISOString();
        queriesUsed = 0;
        await supabase
          .from("daily_query_usage")
          .update({ queries_used: 0, cycle_started_at: cycleStartedAt, query_date: new Date().toISOString().split("T")[0] })
          .eq("external_user_id", privyUserId);
      } else {
        queriesUsed = usage.queries_used || 0;
        cycleStartedAt = usage.cycle_started_at;
      }
    } else {
      cycleStartedAt = new Date(now).toISOString();
    }

    if (limits.maxQueries !== -1 && queriesUsed >= limits.maxQueries) {
      const cycleStart = new Date(cycleStartedAt).getTime();
      const resetTime = cycleStart + CYCLE_DURATION_MS;
      return new Response(JSON.stringify({ 
        error: "Daily query limit reached",
        queriesUsed,
        maxQueries: limits.maxQueries,
        cycleStartedAt,
        resetTime,
      }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (usage) {
      const { error: updateErr } = await supabase
        .from("daily_query_usage")
        .update({ queries_used: queriesUsed + 1, cycle_started_at: cycleStartedAt })
        .eq("external_user_id", privyUserId);
      if (updateErr) console.error("Usage update error:", updateErr);
    } else {
      const { error: insertErr } = await supabase
        .from("daily_query_usage")
        .insert({
          external_user_id: privyUserId,
          query_date: new Date().toISOString().split("T")[0],
          queries_used: 1,
          cycle_started_at: cycleStartedAt,
        });
      if (insertErr) console.error("Usage insert error:", insertErr);
    }

    let systemContent = SYSTEM_PROMPT;

    // Inject admin overrides: if a super admin has overridden a response for a similar query,
    // use that override as authoritative context so the LLM doesn't repeat unverified answers.
    try {
      const lastUserMsg = messages?.[messages.length - 1]?.content || "";
      if (lastUserMsg) {
        const { data: overrides } = await supabase
          .from("chat_feedback")
          .select("user_query, admin_override")
          .eq("admin_reviewed", true)
          .not("admin_override", "is", null);

        if (overrides && overrides.length > 0) {
          const matchingOverrides = overrides.filter((o: any) => {
            if (!o.user_query || !o.admin_override) return false;
            // Case-insensitive substring match on the user query
            const oq = o.user_query.toLowerCase().trim();
            const uq = lastUserMsg.toLowerCase().trim();
            return oq === uq || uq.includes(oq) || oq.includes(uq);
          });

          if (matchingOverrides.length > 0) {
            const overrideBlock = matchingOverrides
              .map((o: any) => `Q: ${o.user_query}\nVerified Answer: ${o.admin_override}`)
              .join("\n\n");
            systemContent += `\n\nADMIN-VERIFIED OVERRIDES (these are authoritative — use these answers instead of saying UNVERIFIED):\n${overrideBlock}`;
          }
        }
      }
    } catch (overrideErr) {
      console.error("Override lookup failed:", overrideErr);
    }

    if (context && context.length > 0) {
      let cleanContext = context
        .replace(/<Base64-Image-Removed>/g, "")
        .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
        .replace(/https?:\/\/[^\s)]+\.(png|jpg|jpeg|gif|svg|webp|ico)[^\s)]*/gi, "")
        .replace(/\s{3,}/g, "\n")
        .trim()
        .substring(0, 2000);
      systemContent += `\n\nRELEVANT CONTEXT FROM VERIFIED SOURCES:\n${cleanContext}`;
    }

    // Character truncation is handled client-side; do not constrain the AI's response length here.

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemContent },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cycleStart = new Date(cycleStartedAt).getTime();
    const resetTime = cycleStart + CYCLE_DURATION_MS;

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "X-User-Tier": tier,
        "X-Max-Characters": String(limits.maxCharacters),
        "X-Queries-Used": String(queriesUsed + 1),
        "X-Max-Queries": String(limits.maxQueries),
        "X-Cycle-Started-At": cycleStartedAt,
        "X-Reset-Time": String(resetTime),
      },
    });
  } catch (e) {
    console.error("Chat error:", e);
    return new Response(JSON.stringify({ error: "An unexpected error occurred" }), {
      status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
