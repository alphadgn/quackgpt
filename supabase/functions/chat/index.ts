import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-privy-user-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TIER_LIMITS: Record<string, { maxQueries: number; maxCharacters: number }> = {
  free: { maxQueries: 1, maxCharacters: 100 },
  nft_holder: { maxQueries: 5, maxCharacters: 1000 },
  paid: { maxQueries: 3, maxCharacters: 300 },
};

const CYCLE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

const SYSTEM_PROMPT = `You are quackGPT — a sharp, no-nonsense InfoFi intelligence engine built for the Wallchain ecosystem. Think Grok meets financial terminal: direct, witty when appropriate, and ruthlessly factual.

Your domain expertise covers:
- Wallchain (Web3 infrastructure protocol powering InfoFi/AttentionFi — the tokenization of attention and information flows)
- InfoFi (the emerging paradigm of information-as-finance, where data attention has measurable economic value)
- Quack Heads (the official NFT collection of Wallchain, available on Solana via Magic Eden)
- gQuack (governance token of quack.xyz ecosystem)
- $QUACK token and quack.xyz ecosystem

RESPONSE STYLE:
- Answer from an InfoFi-native perspective: treat information like a financial instrument. Be analytical, direct, and concise.
- Use a confident, slightly irreverent tone — like a well-informed trader who knows the space cold.
- When relevant, frame answers through the lens of attention economics, information value, and the InfoFi thesis.
- Don't hedge unnecessarily. If you know it, state it. If you don't, say so plainly.

HARD RULES:
1. ALL information MUST come from verified Wallchain sources. No speculation, no fabrication.
2. ABSOLUTELY FORBIDDEN: creating tweets, threads, articles, marketing copy, scripts, captions, storytelling, or any promotional/persuasive language. If asked, respond: "I am a factual verification engine. I do not create content, marketing copy, or narratives."
3. If you lack verified information on a topic (e.g., gQuack token specifics), say so honestly rather than guessing.
4. Prioritize scraped context from official sources when available — that's your primary intelligence feed.
5. Keep it tight. No filler. Every sentence should carry signal, not noise.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Get Privy user ID from header
    const privyUserId = req.headers.get("x-privy-user-id");
    if (!privyUserId) {
      return new Response(JSON.stringify({ error: "Sign in required to use quackGPT" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role client for DB operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get or create user profile
    let { data: profile } = await supabase
      .from("profiles")
      .select("tier")
      .eq("external_user_id", privyUserId)
      .single();

    if (!profile) {
      await supabase
        .from("profiles")
        .insert({ external_user_id: privyUserId, tier: "free" });
      profile = { tier: "free" };
    }

    const tier = profile.tier || "free";
    const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;

    // Check user's current cycle usage
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
        // Cycle expired — reset: update existing row with new cycle
        cycleStartedAt = new Date(now).toISOString();
        queriesUsed = 0;
        await supabase
          .from("daily_query_usage")
          .update({ queries_used: 0, cycle_started_at: cycleStartedAt, query_date: new Date().toISOString().split("T")[0] })
          .eq("external_user_id", privyUserId);
      } else {
        // Still within cycle
        queriesUsed = usage.queries_used || 0;
        cycleStartedAt = usage.cycle_started_at;
      }
    } else {
      // First ever query — create new usage row, cycle starts now
      cycleStartedAt = new Date(now).toISOString();
    }

    if (queriesUsed >= limits.maxQueries) {
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

    // Increment query count
    if (usage && queriesUsed > 0 || (usage && queriesUsed === 0)) {
      await supabase
        .from("daily_query_usage")
        .update({ queries_used: queriesUsed + 1, cycle_started_at: cycleStartedAt })
        .eq("external_user_id", privyUserId);
    } else {
      await supabase
        .from("daily_query_usage")
        .insert({ user_id: privyUserId, external_user_id: privyUserId, query_date: new Date().toISOString().split("T")[0], queries_used: 1, cycle_started_at: cycleStartedAt });
    }

    // Build system message
    let systemContent = SYSTEM_PROMPT;
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

    systemContent += `\n\nIMPORTANT: Your response MUST be ${limits.maxCharacters} characters or less. Be extremely concise.`;

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
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
