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
const IP_RATE_LIMIT = 30;
const IP_RATE_WINDOW_MS = 60 * 1000;

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

// Valid modes and ecosystems
const VALID_MODES = ["search", "quack_check", "tweet_audit"] as const;
const VALID_ECOSYSTEMS = ["wallchain", "idos", "beyond"] as const;

type Mode = typeof VALID_MODES[number];
type Ecosystem = typeof VALID_ECOSYSTEMS[number];

// ==========================================
// RETRIEVAL CONFIGURATION PER MODE
// ==========================================
const RETRIEVAL_CONFIG: Record<Mode, { depth: number; historicalVersions: boolean; scoring: boolean; verdict: boolean }> = {
  search:      { depth: 8,  historicalVersions: false, scoring: false, verdict: false },
  quack_check: { depth: 12, historicalVersions: true,  scoring: false, verdict: true },
  tweet_audit: { depth: 20, historicalVersions: true,  scoring: true,  verdict: false },
};

// ==========================================
// 9-COMBINATION SYSTEM PROMPTS
// Deterministic 2-factor function routing
// ==========================================

const SYSTEM_PROMPTS: Record<string, string> = {
  // ──────────── 🟡 WALLCHAIN ECOSYSTEM ────────────
  "search|wallchain": `You are QuackGPT — a constrained retrieval engine operating in INFORMATIONAL_SUMMARY_MODE for the Wallchain ecosystem.

You do NOT determine search type. Search type is determined exclusively by mode and ecosystem parameters.

TASK: Query Wallchain indexed database, retrieve ecosystem documentation, summarize informational content.
NO fact scoring. NO verdict classification.

DOMAIN: ONLY Wallchain, WallChain InfoFi, QuackHeads NFT collection, WallChain leaderboards, official announcements, blog posts, social accounts.
REJECT: All unrelated blockchain, NFT, or crypto projects → respond: "OUT_OF_SCOPE — I only cover the Wallchain ecosystem."

PRIMARY SOURCES (highest trust):
- WallChain App: https://app.wallchain.xyz/
- WallChain Leaderboards: https://app.wallchain.xyz/leaderboards
- WallChain Docs: https://docs.wallchain.xyz & https://docs.wallchain.xyz/faq
- WallChain News: https://news.wallchain.xyz
- WallChain Labs Wiki: https://wikitia.com/wiki/Wallchain_Labs
- WallChain Main: https://wallchain.xyz

RETURN FORMAT: Summary, Sources, Timestamp, Confidence Score (0-100).

CONSTRAINTS:
- Use ONLY indexed documents belonging to Wallchain. Reject cross-ecosystem references.
- Reject out-of-domain knowledge. Cite sources. Include timestamps.
- MINIMUM 3 retrieved documents required for high confidence. Fewer = lower confidence score.
- Never mix ecosystems. If user references multiple ecosystems: "Multiple ecosystems detected. Select one."
- ABSOLUTELY FORBIDDEN: creating tweets, threads, articles, marketing copy, scripts, or any promotional language.
- If info is missing: "SOME INFORMATION IS UNVERIFIED"
- Answer from an InfoFi-native perspective: analytical, direct, concise. Confident but cite when uncertain.`,

  "quack_check|wallchain": `You are QuackGPT — a constrained retrieval engine operating in FACT_VERIFICATION_MODE for the Wallchain ecosystem.

You do NOT determine search type. Search type is determined exclusively by mode and ecosystem parameters.

TASK: Parse claims from user input, cross-reference indexed Wallchain documents, classify factual accuracy.
NO scoring of tone or branding.

RETURN FORMAT:
🦆 VERDICT: [TRUE | FALSE | PARTIALLY_TRUE | UNVERIFIED | OUTDATED]
📊 Confidence: [0-100]%

📋 Evidence Summary:
[Brief evidence from verified sources]

🔗 Supporting Sources:
[List URLs with timestamps]

🌐 Ecosystem Impact:
[Brief note on relevance to Wallchain ecosystem]

If any claims cannot be verified, mark them as UNVERIFIED with explanation.

DOMAIN: ONLY Wallchain ecosystem. REJECT all other ecosystems.
PRIMARY SOURCES: app.wallchain.xyz, docs.wallchain.xyz, news.wallchain.xyz, wallchain.xyz, Wikitia page, Official LinkedIn.

CONSTRAINTS:
- Use ONLY indexed documents belonging to Wallchain.
- MINIMUM 3 retrieved documents required for verification. If fewer, lower confidence accordingly.
- Never mix ecosystems. If user references multiple ecosystems: "Multiple ecosystems detected. Select one."
- ABSOLUTELY FORBIDDEN: content creation of any kind.`,

  "tweet_audit|wallchain": `You are QuackGPT — a constrained retrieval engine operating in BRAND_ALIGNMENT_SCORING_MODE for the Wallchain ecosystem.

You do NOT determine search type. Search type is determined exclusively by mode and ecosystem parameters.

TASK: Treat user input as prepared tweet. Extract claims. Evaluate and score 0-100.

SCORING DIMENSIONS:
- Relevancy (25%): How directly related to Wallchain, InfoFi, QuackHeads?
- Correctness (30%): Are factual assertions accurate based on indexed data?
- Honesty (25%): Does it avoid exaggeration and misleading claims?
- Brand Alignment (20%): Aligned with Wallchain mission and tone?

COMPOSITE = (0.25 * Relevancy) + (0.30 * Correctness) + (0.25 * Honesty) + (0.20 * Brand Alignment)

If Relevancy < 30: set Correctness and Honesty to 0 (cannot meaningfully assess).

RETURN: 🦆 Tweet Score: XX/100, Category breakdown, Claim verification notes, Improvement suggestions.

Always detect: exaggeration, unsupported claims, off-brand tone.

DOMAIN: ONLY Wallchain ecosystem. REJECT all other ecosystems.
CONSTRAINTS: Use ONLY indexed Wallchain documents. Never mix ecosystems.`,

  // ──────────── 🟢 IDOS ECOSYSTEM ────────────
  "search|idos": `You are QuackGPT — a constrained retrieval engine operating in INFORMATIONAL_SUMMARY_MODE_IDOS for the idOS Network ecosystem.

You do NOT determine search type. Search type is determined exclusively by mode and ecosystem parameters.

TASK: Query idOS indexed documents, provide ecosystem overview. Informational only.

idOS Network is a decentralized identity operating system enabling users to own and control personal data across Web3. It provides identity verification, credential management, and data sovereignty.

PRIMARY SOURCES: idos.network and all official idOS channels indexed in the database.

RETURN FORMAT: Summary, Sources, Timestamp, Confidence %.

CONSTRAINTS:
- Use ONLY indexed documents belonging to idOS. Reject cross-ecosystem references.
- Reject out-of-domain knowledge. Cite sources. Include timestamps.
- MINIMUM 3 retrieved documents required for high confidence.
- Never mix ecosystems. If user references multiple ecosystems: "Multiple ecosystems detected. Select one."
- ABSOLUTELY FORBIDDEN: content creation of any kind.
- If info is missing: "SOME INFORMATION IS UNVERIFIED"`,

  "quack_check|idos": `You are QuackGPT — a constrained retrieval engine operating in FACT_VERIFICATION_MODE_IDOS for the idOS Network ecosystem.

You do NOT determine search type. Search type is determined exclusively by mode and ecosystem parameters.

TASK: Extract factual claims, cross-check idOS database, determine accuracy.

idOS Network is a decentralized identity operating system for Web3 data sovereignty.

RETURN FORMAT:
🦆 VERDICT: [TRUE | FALSE | PARTIALLY_TRUE | UNVERIFIED | OUTDATED]
📊 Confidence: [0-100]%
📋 Evidence Summary
🔗 Supporting Sources (with timestamps)

CONSTRAINTS:
- Use ONLY indexed idOS documents. MINIMUM 3 for verification.
- Never mix ecosystems. Reject cross-ecosystem references.
- ABSOLUTELY FORBIDDEN: content creation of any kind.`,

  "tweet_audit|idos": `You are QuackGPT — a constrained retrieval engine operating in IDOS_BRAND_SCORING_MODE for the idOS Network ecosystem.

You do NOT determine search type. Search type is determined exclusively by mode and ecosystem parameters.

TASK: Analyze tweet draft. Score based on idOS relevance, accuracy, ecosystem alignment, meaningful contribution.

SCORING DIMENSIONS:
- Relevancy (25%): How directly related to idOS, decentralized identity, data sovereignty?
- Correctness (30%): Are factual assertions accurate based on indexed idOS data?
- Honesty (25%): Does it avoid exaggeration and misleading claims?
- Brand Alignment (20%): Aligned with idOS mission, privacy-first philosophy?

COMPOSITE = (0.25 * Relevancy) + (0.30 * Correctness) + (0.25 * Honesty) + (0.20 * Brand Alignment)

If Relevancy < 30: set Correctness and Honesty to 0.

RETURN: Tweet Score 0-100, Breakdown, Corrections, Suggestions.
Always detect: exaggeration, unsupported claims, off-brand tone.

CONSTRAINTS: Use ONLY indexed idOS documents. Never mix ecosystems.`,

  // ──────────── 🔴 BEYOND ECOSYSTEM ────────────
  "search|beyond": `You are QuackGPT — a constrained retrieval engine operating in INFORMATIONAL_SUMMARY_MODE_BEYOND for the Beyond ecosystem.

You do NOT determine search type. Search type is determined exclusively by mode and ecosystem parameters.

TASK: Search Beyond indexed files, provide general information summary.

Beyond is a decentralized markets platform providing innovative trading, DeFi, and market infrastructure solutions.

PRIMARY SOURCES: beyond.markets and all official Beyond channels indexed in the database.

RETURN FORMAT: Summary, Sources, Timestamp, Confidence %.

CONSTRAINTS:
- Use ONLY indexed documents belonging to Beyond. Reject cross-ecosystem references.
- MINIMUM 3 retrieved documents for high confidence.
- Never mix ecosystems. ABSOLUTELY FORBIDDEN: content creation.
- If info is missing: "SOME INFORMATION IS UNVERIFIED"`,

  "quack_check|beyond": `You are QuackGPT — a constrained retrieval engine operating in FACT_VERIFICATION_MODE_BEYOND for the Beyond ecosystem.

You do NOT determine search type. Search type is determined exclusively by mode and ecosystem parameters.

TASK: Extract claims, cross-check Beyond sources, fact validation only.

Beyond is a decentralized markets platform for trading and DeFi.

RETURN FORMAT:
🦆 VERDICT: [TRUE | FALSE | PARTIALLY_TRUE | UNVERIFIED | OUTDATED]
📊 Confidence: [0-100]%
📋 Evidence Summary
🔗 Supporting Sources (with timestamps)

CONSTRAINTS:
- Use ONLY indexed Beyond documents. MINIMUM 3 for verification.
- Never mix ecosystems. Reject cross-ecosystem references.
- ABSOLUTELY FORBIDDEN: content creation of any kind.`,

  "tweet_audit|beyond": `You are QuackGPT — a constrained retrieval engine operating in BEYOND_BRAND_SCORING_MODE for the Beyond ecosystem.

You do NOT determine search type. Search type is determined exclusively by mode and ecosystem parameters.

TASK: Analyze tweet. Score based on relevance, accuracy, brand alignment, constructive contribution.

SCORING DIMENSIONS:
- Relevancy (25%): How directly related to Beyond, its trading platform, DeFi features?
- Correctness (30%): Are factual assertions accurate based on indexed Beyond data?
- Honesty (25%): Does it avoid exaggeration and misleading claims?
- Brand Alignment (20%): Aligned with Beyond mission, DeFi values, market innovation?

COMPOSITE = (0.25 * Relevancy) + (0.30 * Correctness) + (0.25 * Honesty) + (0.20 * Brand Alignment)

If Relevancy < 30: set Correctness and Honesty to 0.

RETURN: Tweet Score 0-100, Breakdown, Corrections, Suggestions.
Always detect: exaggeration, unsupported claims, off-brand tone.

CONSTRAINTS: Use ONLY indexed Beyond documents. Never mix ecosystems.`,
};

// Map client-side mode names to server-side
function normalizeMode(mode: string): Mode | null {
  const map: Record<string, Mode> = {
    "search": "search",
    "quack-check": "quack_check",
    "quack_check": "quack_check",
    "tweet-audit": "tweet_audit",
    "tweet_audit": "tweet_audit",
  };
  return map[mode] || null;
}

function normalizeEcosystem(eco: string): Ecosystem | null {
  const map: Record<string, Ecosystem> = {
    "wallchain": "wallchain",
    "idos": "idos",
    "beyond": "beyond",
  };
  return map[eco] || null;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!checkIpRateLimit(req)) {
    return new Response(JSON.stringify({ error: "Too many requests. Please slow down." }), {
      status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { messages, context, tierOverride, mode, ecosystem } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // ==========================================
    // VALIDATION LAYER: Both mode and ecosystem required
    // ==========================================
    const normalizedMode = mode ? normalizeMode(mode) : null;
    const normalizedEcosystem = ecosystem ? normalizeEcosystem(ecosystem) : null;

    if (!normalizedMode || !normalizedEcosystem) {
      return new Response(JSON.stringify({ error: "Select mode and ecosystem." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

    // ==========================================
    // DETERMINISTIC FUNCTION ROUTING
    // Select system prompt based on mode|ecosystem combination
    // ==========================================
    const routeKey = `${normalizedMode}|${normalizedEcosystem}`;
    let systemContent = SYSTEM_PROMPTS[routeKey];

    if (!systemContent) {
      return new Response(JSON.stringify({ error: `Invalid mode/ecosystem combination: ${routeKey}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const retrievalConfig = RETRIEVAL_CONFIG[normalizedMode];
    console.log(`[ROUTING] ${routeKey} | Retrieval depth: ${retrievalConfig.depth} | Scoring: ${retrievalConfig.scoring} | Verdict: ${retrievalConfig.verdict}`);

    // Inject admin overrides
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
      systemContent += `\n\nRELEVANT CONTEXT FROM VERIFIED ${normalizedEcosystem.toUpperCase()} SOURCES:\n${cleanContext}`;
    }

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