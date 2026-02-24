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
const IP_RATE_LIMIT = 60;
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
  return entry.count <= IP_RATE_LIMIT;
}

const TIER_LIMITS: Record<string, { maxQueries: number; maxCharacters: number }> = {
  free: { maxQueries: 1, maxCharacters: 100 },
  nft_holder: { maxQueries: 5, maxCharacters: 5000 },
  paid: { maxQueries: 3, maxCharacters: 300 },
};

const CYCLE_DURATION_MS = 24 * 60 * 60 * 1000;

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!checkIpRateLimit(req)) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const privyUserId = await verifyPrivyToken(req);

    if (!privyUserId) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse optional tierOverride from POST body
    let tierOverride: string | null = null;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body?.tierOverride && ["free", "paid", "nft_holder"].includes(body.tierOverride)) {
          tierOverride = body.tierOverride;
        }
      } catch { /* GET request or no body */ }
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify super admin if tierOverride is requested
    let isSuperAdmin = false;
    if (tierOverride) {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", privyUserId)
        .eq("role", "super_admin")
        .maybeSingle();
      isSuperAdmin = !!roleData;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("tier")
      .eq("external_user_id", privyUserId)
      .single();

    // Super admin tier override takes precedence
    const tier = (isSuperAdmin && tierOverride) ? tierOverride : (profile?.tier || "free");
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
    let resetTime: number | null = null;

    if (usage) {
      const cycleStart = new Date(usage.cycle_started_at).getTime();
      const cycleEnd = cycleStart + CYCLE_DURATION_MS;

      if (now >= cycleEnd) {
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
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      }
    );
  }
});
