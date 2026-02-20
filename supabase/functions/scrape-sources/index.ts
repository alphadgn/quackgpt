import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Expanded whitelisted sources
// Wallchain NFT collection = Quack Heads NFT collection
const SCRAPE_URLS = [
  "https://docs.wallchain.xyz/intro",
  "https://news.wallchain.xyz/",
  "https://app.wallchain.xyz/leaderboards",
  "https://app.wallchain.xyz/",
  "https://wallchain.notion.site",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const privyUserId = req.headers.get("x-privy-user-id");
    if (!privyUserId || !/^did:privy:[a-zA-Z0-9]{1,50}$/.test(privyUserId)) {
      return new Response(
        JSON.stringify({ success: false, error: "Authentication required", context: "" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { query } = await req.json();
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");

    if (!FIRECRAWL_API_KEY) {
      console.error("FIRECRAWL_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Scraping service not configured", context: "" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Scraping Wallchain sources for query:", query);

    // Scrape all sources in parallel
    const scrapePromises = SCRAPE_URLS.map(async (url) => {
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
        // Tag source and truncate per-source
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

    // Truncate total context
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
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
