import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Whitelisted sources for Wallchain/InfoFi/quack ecosystem
const WHITELISTED_DOMAINS = [
  "docs.wallchain.xyz",
  "news.wallchain.xyz",
  "app.wallchain.xyz",
  "wallchain.xyz",
  "quack.xyz",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");

    if (!FIRECRAWL_API_KEY) {
      console.error("FIRECRAWL_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Scraping service not configured", context: "" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // First, scrape the main docs page for context
    const docsUrl = "https://docs.wallchain.xyz/intro";
    
    console.log("Scraping Wallchain docs for query:", query);

    const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: docsUrl,
        formats: ["markdown"],
        onlyMainContent: true,
      }),
    });

    if (!scrapeResponse.ok) {
      const errorData = await scrapeResponse.text();
      console.error("Firecrawl API error:", scrapeResponse.status, errorData);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to scrape sources", context: "" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const scrapeData = await scrapeResponse.json();
    const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";

    // Truncate context to avoid token limits
    const maxContextLength = 3000;
    const context = markdown.length > maxContextLength 
      ? markdown.substring(0, maxContextLength) + "..."
      : markdown;

    console.log("Successfully scraped docs, context length:", context.length);

    return new Response(
      JSON.stringify({ 
        success: true, 
        context,
        source: docsUrl 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Scrape error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error", context: "" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
