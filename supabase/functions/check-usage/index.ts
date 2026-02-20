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

const CYCLE_DURATION_MS = 24 * 60 * 60 * 1000;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const privyUserId = req.headers.get("x-privy-user-id");
    if (!privyUserId || !/^did:privy:[a-zA-Z0-9]{1,50}$/.test(privyUserId)) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get profile tier
    const { data: profile } = await supabase
      .from("profiles")
      .select("tier")
      .eq("external_user_id", privyUserId)
      .single();

    const tier = profile?.tier || "free";
    const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;

    // Get latest usage row
    const { data: usage } = await supabase
      .from("daily_query_usage")
      .select("queries_used, cycle_started_at")
      .eq("external_user_id", privyUserId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const now = Date.now();
    let queriesUsed = 0;
    let resetTime: number | null = null;

    if (usage) {
      const cycleStart = new Date(usage.cycle_started_at).getTime();
      const cycleEnd = cycleStart + CYCLE_DURATION_MS;

      if (now >= cycleEnd) {
        // Cycle expired — reset
        queriesUsed = 0;
        resetTime = null;
        await supabase
          .from("daily_query_usage")
          .update({
            queries_used: 0,
            cycle_started_at: new Date(now).toISOString(),
            query_date: new Date().toISOString().split("T")[0],
          })
          .eq("external_user_id", privyUserId);
      } else {
        queriesUsed = usage.queries_used || 0;
        resetTime = cycleEnd;
      }
    }

    return new Response(
      JSON.stringify({
        queriesUsed,
        maxQueries: limits.maxQueries,
        tier,
        resetTime,
        maxCharacters: limits.maxCharacters,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("check-usage error:", e);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
