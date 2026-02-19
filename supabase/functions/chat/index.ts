import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-privy-user-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TIER_LIMITS: Record<string, { maxQueries: number; maxCharacters: number }> = {
  free: { maxQueries: 1, maxCharacters: 100 },
  nft_holder: { maxQueries: 3, maxCharacters: 500 },
  paid: { maxQueries: 2, maxCharacters: 300 },
};

const SYSTEM_PROMPT = `You are quackGPT, an intelligence interface that provides ONLY factual, verified information about:
- Wallchain (Web3 infrastructure protocol powering InfoFi/AttentionFi)
- InfoFi (tokenization of attention and information)
- Quack Heads (the official NFT collection of Wallchain, available on Solana via Magic Eden)
- gQuack (governance token of quack.xyz ecosystem)
- $QUACK token and quack.xyz ecosystem

CRITICAL RULES:
1. You MUST ONLY provide factual information sourced from verified Wallchain sources.
2. You are FORBIDDEN from creating tweets, threads, articles, marketing copy, scripts, or captions.
3. You ONLY provide definitions, factual explanations, summaries, and direct answers.
4. Keep responses concise and factual. Never speculate or invent information.
5. If you don't have verified information about something (like gQuack tokens), say so honestly rather than making up details.
6. If asked to create content, respond: "Content creation is not supported. quackGPT only provides factual information from verified sources."

If context from scraped sources is provided, prioritize that information in your response.`;

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
      // Auto-create profile for new Privy user
      await supabase
        .from("profiles")
        .insert({ external_user_id: privyUserId, tier: "free" });
      profile = { tier: "free" };
    }

    const tier = profile.tier || "free";
    const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;

    // Check daily query usage
    const today = new Date().toISOString().split("T")[0];
    const { data: usage } = await supabase
      .from("daily_query_usage")
      .select("queries_used")
      .eq("external_user_id", privyUserId)
      .eq("query_date", today)
      .single();

    const queriesUsed = usage?.queries_used || 0;

    if (queriesUsed >= limits.maxQueries) {
      return new Response(JSON.stringify({ 
        error: "Daily query limit reached",
        queriesUsed,
        maxQueries: limits.maxQueries,
      }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Increment query count
    if (usage) {
      await supabase
        .from("daily_query_usage")
        .update({ queries_used: queriesUsed + 1 })
        .eq("external_user_id", privyUserId)
        .eq("query_date", today);
    } else {
      await supabase
        .from("daily_query_usage")
        .insert({ external_user_id: privyUserId, query_date: today, queries_used: 1 });
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

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "X-User-Tier": tier,
        "X-Max-Characters": String(limits.maxCharacters),
        "X-Queries-Used": String(queriesUsed + 1),
        "X-Max-Queries": String(limits.maxQueries),
      },
    });
  } catch (e) {
    console.error("Chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
