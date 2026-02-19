import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are quackGPT, an intelligence interface that provides ONLY factual, verified information about:
- Wallchain (Web3 infrastructure protocol powering InfoFi/AttentionFi)
- InfoFi (tokenization of attention and information)
- Quack Heads (the official NFT collection of Wallchain, available on Solana via Magic Eden)
- gQuack (governance token of quack.xyz ecosystem)
- $QUACK token and quack.xyz ecosystem

CRITICAL RULES:
1. You MUST ONLY provide factual information sourced from:
   - Wallchain documentation (docs.wallchain.xyz)
   - Wallchain news and leaderboards (app.wallchain.xyz)
   - Official Wallchain social media (@wallchain on Twitter/X, Telegram, Instagram, LinkedIn, YouTube, TikTok)
   - quack.xyz ecosystem data

2. You are FORBIDDEN from:
   - Creating tweets, threads, articles, marketing copy, scripts, or captions
   - Generating promotional or persuasive content
   - Storytelling or creative writing
   - Any form of content creation

3. You ONLY provide:
   - Definitions and factual explanations
   - Summaries of existing information
   - Analytical descriptions of the ecosystem
   - Direct answers based on verified sources

4. Keep responses concise and factual. Never speculate or invent information.

5. If asked to create content, respond: "Content creation is not supported. quackGPT only provides factual information from verified sources."

If context from scraped sources is provided, prioritize that information in your response.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context, maxCharacters } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build system message with optional context (trimmed to avoid exceeding limits)
    let systemContent = SYSTEM_PROMPT;
    if (context && context.length > 0) {
      // Trim context to a reasonable size to avoid gateway errors
      const trimmedContext = context.substring(0, 3000);
      systemContent += `\n\nRELEVANT CONTEXT FROM VERIFIED SOURCES:\n${trimmedContext}`;
    }
    
    if (maxCharacters) {
      systemContent += `\n\nIMPORTANT: Your response MUST be ${maxCharacters} characters or less. Be extremely concise.`;
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
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service temporarily unavailable." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
