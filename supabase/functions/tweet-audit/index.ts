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
    const { payload } = await jwtVerify(token, PRIVY_JWKS, { issuer: "privy.io", audience: PRIVY_APP_ID });
    return (payload.sub as string) || null;
  } catch (e) {
    console.error("Privy JWT verification failed:", e);
    return null;
  }
}

const ipRequestCounts = new Map<string, { count: number; windowStart: number }>();

function checkIpRateLimit(req: Request): boolean {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || "unknown";
  const now = Date.now();
  const entry = ipRequestCounts.get(ip);
  if (!entry || now - entry.windowStart > 60000) {
    ipRequestCounts.set(ip, { count: 1, windowStart: now });
    return true;
  }
  entry.count++;
  return entry.count <= 20;
}

const TIER_LIMITS: Record<string, { maxQueries: number; maxCharacters: number }> = {
  free: { maxQueries: 1, maxCharacters: 100 },
  nft_holder: { maxQueries: 5, maxCharacters: 5000 },
  paid: { maxQueries: 3, maxCharacters: 300 },
};

const CYCLE_DURATION_MS = 24 * 60 * 60 * 1000;

const CAMPAIGN_PROMPTS: Record<string, string> = {
  wallchain: `You are QuackGPT Tweet Auditor. You evaluate user-drafted Twitter/X posts for alignment with the WallChain ecosystem.

SCORING DIMENSIONS (each 0-100):

1. RELEVANCY SCORE: How directly related is the tweet to WallChain, InfoFi, QuackHeads, or official ecosystem developments?
2. HONESTY SCORE: Does it avoid exaggeration, misleading language, and false claims?
3. CORRECTNESS SCORE: Are factual assertions accurate based on indexed WallChain data?
4. BRAND ALIGNMENT SCORE: Is it aligned with WallChain mission, InfoFi philosophy, ecosystem values, and on-brand tone?

COMPOSITE SCORE = (0.25 * Relevancy) + (0.30 * Correctness) + (0.25 * Honesty) + (0.20 * Brand Alignment)

You MUST respond using the "score_tweet" tool with the structured output.

For each claim in the tweet:
- Extract the factual assertion
- Cross-check against WallChain indexed knowledge
- Identify any exaggeration or inaccuracy
- Note if information is UNVERIFIED

Be strict but fair. A tweet that is factually correct and on-brand should score high.`,

  idos: `You are QuackGPT Tweet Auditor. You evaluate user-drafted Twitter/X posts for alignment with the idOS Network ecosystem.

idOS Network is a decentralized identity operating system that enables users to own and control their personal data across Web3. It provides identity verification, credential management, and data sovereignty.

SCORING DIMENSIONS (each 0-100):

1. RELEVANCY SCORE: How directly related is the tweet to idOS Network, decentralized identity, data sovereignty, credential management, or official idOS developments?
2. HONESTY SCORE: Does it avoid exaggeration, misleading language, and false claims?
3. CORRECTNESS SCORE: Are factual assertions accurate based on indexed idOS data?
4. BRAND ALIGNMENT SCORE: Is it aligned with idOS mission, decentralized identity values, privacy-first philosophy, and on-brand tone?

COMPOSITE SCORE = (0.25 * Relevancy) + (0.30 * Correctness) + (0.25 * Honesty) + (0.20 * Brand Alignment)

You MUST respond using the "score_tweet" tool with the structured output.

For each claim in the tweet:
- Extract the factual assertion
- Cross-check against idOS indexed knowledge
- Identify any exaggeration or inaccuracy
- Note if information is UNVERIFIED

Be strict but fair. A tweet that is factually correct and on-brand should score high.`,

  beyond: `You are QuackGPT Tweet Auditor. You evaluate user-drafted Twitter/X posts for alignment with the Beyond ecosystem.

Beyond is a decentralized markets platform. It provides innovative trading, DeFi, and market infrastructure solutions.

SCORING DIMENSIONS (each 0-100):

1. RELEVANCY SCORE: How directly related is the tweet to Beyond, its trading platform, DeFi features, market infrastructure, or official Beyond developments?
2. HONESTY SCORE: Does it avoid exaggeration, misleading language, and false claims?
3. CORRECTNESS SCORE: Are factual assertions accurate based on indexed Beyond data?
4. BRAND ALIGNMENT SCORE: Is it aligned with Beyond mission, DeFi values, market innovation philosophy, and on-brand tone?

COMPOSITE SCORE = (0.25 * Relevancy) + (0.30 * Correctness) + (0.25 * Honesty) + (0.20 * Brand Alignment)

You MUST respond using the "score_tweet" tool with the structured output.

For each claim in the tweet:
- Extract the factual assertion
- Cross-check against Beyond indexed knowledge
- Identify any exaggeration or inaccuracy
- Note if information is UNVERIFIED

Be strict but fair. A tweet that is factually correct and on-brand should score high.`,
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!checkIpRateLimit(req)) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const privyUserId = await verifyPrivyToken(req);
    if (!privyUserId) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { tweetText, context, campaign } = await req.json();

    if (!tweetText || typeof tweetText !== "string" || tweetText.trim().length < 5) {
      return new Response(JSON.stringify({ error: "Tweet text must be at least 5 characters" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (tweetText.length > 1000) {
      return new Response(JSON.stringify({ error: "Tweet text too long (max 1000 chars)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- USAGE DEDUCTION: Tweet audit counts as 1 query ---
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: profile } = await supabase
      .from("profiles")
      .select("tier")
      .eq("external_user_id", privyUserId)
      .single();

    const tier = profile?.tier || "free";
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
        resetTime,
      }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Increment usage
    if (usage) {
      await supabase
        .from("daily_query_usage")
        .update({ queries_used: queriesUsed + 1, cycle_started_at: cycleStartedAt })
        .eq("external_user_id", privyUserId);
    } else {
      await supabase
        .from("daily_query_usage")
        .insert({
          external_user_id: privyUserId,
          query_date: new Date().toISOString().split("T")[0],
          queries_used: 1,
          cycle_started_at: cycleStartedAt,
        });
    }

    // --- AI AUDIT ---
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const selectedCampaign = (typeof campaign === "string" && CAMPAIGN_PROMPTS[campaign]) ? campaign : "wallchain";
    let systemContent = CAMPAIGN_PROMPTS[selectedCampaign];
    if (context) {
      systemContent += `\n\nRELEVANT ECOSYSTEM CONTEXT:\n${String(context).substring(0, 4000)}`;
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
          { role: "user", content: `Audit this tweet draft:\n\n"${tweetText.trim()}"` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "score_tweet",
            description: "Return the tweet audit scores and analysis",
            parameters: {
              type: "object",
              properties: {
                relevancy_score: { type: "number", description: "0-100 relevancy to WallChain ecosystem" },
                honesty_score: { type: "number", description: "0-100 honesty assessment" },
                correctness_score: { type: "number", description: "0-100 factual correctness" },
                brand_alignment_score: { type: "number", description: "0-100 brand alignment" },
                summary: { type: "string", description: "Brief overall assessment" },
                claim_analysis: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      claim: { type: "string" },
                      verdict: { type: "string", enum: ["TRUE", "FALSE", "PARTIALLY_TRUE", "UNVERIFIED", "NOT_A_CLAIM"] },
                      explanation: { type: "string" },
                    },
                    required: ["claim", "verdict", "explanation"],
                  },
                },
                suggested_improvements: { type: "array", items: { type: "string" } },
                risk_flags: { type: "array", items: { type: "string" } },
              },
              required: ["relevancy_score", "honesty_score", "correctness_score", "brand_alignment_score", "summary", "claim_analysis", "suggested_improvements", "risk_flags"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "score_tweet" } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, try again later" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI service error");
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("No structured response from AI");
    }

    const scores = JSON.parse(toolCall.function.arguments);

    // Prevent hallucinated scores: if relevancy is low, correctness and honesty
    // cannot be meaningfully assessed — force them to 0.
    if (scores.relevancy_score < 30) {
      scores.correctness_score = 0;
      scores.honesty_score = 0;
    }

    const composite = Math.round(
      0.25 * scores.relevancy_score +
      0.30 * scores.correctness_score +
      0.25 * scores.honesty_score +
      0.20 * scores.brand_alignment_score
    );

    // Persist audit
    await supabase.from("tweet_audits").insert({
      external_user_id: privyUserId,
      tweet_text: tweetText.trim(),
      relevancy_score: scores.relevancy_score,
      honesty_score: scores.honesty_score,
      correctness_score: scores.correctness_score,
      brand_alignment_score: scores.brand_alignment_score,
      composite_score: composite,
      detailed_breakdown: scores,
      suggested_improvements: scores.suggested_improvements || [],
      risk_flags: scores.risk_flags || [],
      supporting_sources: [],
    });

    return new Response(JSON.stringify({
      composite_score: composite,
      relevancy_score: scores.relevancy_score,
      honesty_score: scores.honesty_score,
      correctness_score: scores.correctness_score,
      brand_alignment_score: scores.brand_alignment_score,
      summary: scores.summary,
      claim_analysis: scores.claim_analysis || [],
      suggested_improvements: scores.suggested_improvements || [],
      risk_flags: scores.risk_flags || [],
      queriesUsed: queriesUsed + 1,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Tweet audit error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
