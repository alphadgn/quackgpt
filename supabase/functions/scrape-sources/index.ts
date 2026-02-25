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
  return entry.count <= IP_RATE_LIMIT;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!checkIpRateLimit(req)) {
    return new Response(JSON.stringify({ success: false, error: "Too many requests", context: "" }), {
      status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const privyUserId = await verifyPrivyToken(req);

    if (!privyUserId) {
      return new Response(
        JSON.stringify({ success: false, error: "Authentication required", context: "" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { query, campaign } = await req.json();
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");

    if (!FIRECRAWL_API_KEY) {
      console.error("FIRECRAWL_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Scraping service not configured", context: "" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Load active sources from database, filtered by campaign if provided
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let sourcesQuery = supabase
      .from("scrape_sources")
      .select("url, label")
      .eq("is_active", true);
    
    if (campaign && typeof campaign === "string") {
      sourcesQuery = sourcesQuery.eq("campaign", campaign);
    }

    const { data: sources, error: sourcesErr } = await sourcesQuery;

    if (sourcesErr) {
      console.error("Failed to load scrape sources:", sourcesErr);
    }

    const SCRAPE_URLS = sources?.map((s: any) => s.url) || [
      "https://docs.wallchain.xyz/intro",
      "https://news.wallchain.xyz/",
      "https://app.wallchain.xyz/leaderboards",
      "https://app.wallchain.xyz/",
    ];

    console.log("Scraping sources for query:", query, "URLs:", SCRAPE_URLS.length);

    const scrapePromises = SCRAPE_URLS.map(async (url: string) => {
      try {
        const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
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

        if (!response.ok) {
          console.error(`Failed to scrape ${url}:`, response.status);
          return "";
        }

        const data = await response.json();
        const markdown = data.data?.markdown || data.markdown || "";
        const maxPerSource = 1500;
        const truncated = markdown.length > maxPerSource
          ? markdown.substring(0, maxPerSource) + "..."
          : markdown;
        return `[Source: ${url}]\n${truncated}`;
      } catch (e) {
        console.error(`Error scraping ${url}:`, e);
        return "";
      }
    });

    const results = await Promise.all(scrapePromises);
    const combined = results.filter(Boolean).join("\n\n---\n\n");

    const maxContextLength = 6000;
    const context = combined.length > maxContextLength
      ? combined.substring(0, maxContextLength) + "..."
      : combined;

    console.log("Successfully scraped sources, context length:", context.length);

    return new Response(
      JSON.stringify({
        success: true,
        context,
        sources: SCRAPE_URLS,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Scrape error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "An unexpected error occurred", context: "" }),
      { status: 200, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
