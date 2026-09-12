import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  KNOWLEDGE_DOMAIN,
  checkUrl,
  sanitizeRetrievedContent,
  UNAVAILABLE_MESSAGE,
} from "../_shared/knowledge.ts";

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
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
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

interface EvidenceItem {
  canonicalUrl: string;
  title: string;
  publishedAt: string | null;
  retrievedAt: string;
  content: string;
}

function failClosed(corsHeaders: Record<string, string>, reason: string, metrics: Record<string, unknown>) {
  console.error(JSON.stringify({ event: "retrieval_unavailable", reason, knowledge_domain: KNOWLEDGE_DOMAIN, ...metrics }));
  return new Response(
    JSON.stringify({ success: false, error: UNAVAILABLE_MESSAGE, context: "", evidence: { retrievedCount: 0, ...metrics } }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
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

  const retrievedAt = new Date().toISOString();
  let sourcesChecked = 0;
  let rejectedCount = 0;

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body.query !== "string" || body.query.trim().length < 2 || body.query.length > 1_000) {
      return new Response(JSON.stringify({ success: false, error: "A valid question is required", context: "" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ---------------------------------------------------------------
    // 1. Indexed evidence first — scoped to the knowledge domain.
    //    Filtering happens in SQL, BEFORE any ranking.
    // ---------------------------------------------------------------
    const { data: indexed } = await supabase
      .from("indexed_sources")
      .select("canonical_url, source_url, title, content, source_timestamp, retrieved_at, author")
      .eq("knowledge_domain", KNOWLEDGE_DOMAIN)
      .eq("is_current", true)
      .order("source_timestamp", { ascending: false, nullsFirst: false })
      .limit(20);

    const evidenceItems: EvidenceItem[] = [];

    for (const row of indexed || []) {
      const url = row.canonical_url || row.source_url;
      if (!checkUrl(url).approved) { rejectedCount++; continue; }
      evidenceItems.push({
        canonicalUrl: url,
        title: row.title || url,
        publishedAt: row.source_timestamp || null,
        retrievedAt: row.retrieved_at || retrievedAt,
        content: sanitizeRetrievedContent(row.content || "", 1500),
      });
    }

    // ---------------------------------------------------------------
    // 2. Live top-up from the approved active sources (best effort).
    // ---------------------------------------------------------------
    if (evidenceItems.length < 3 && FIRECRAWL_API_KEY) {
      const { data: sources, error: sourcesErr } = await supabase
        .from("scrape_sources")
        .select("url, label")
        .eq("knowledge_domain", KNOWLEDGE_DOMAIN)
        .eq("is_active", true);

      if (sourcesErr) console.error("Failed to load approved sources:", sourcesErr);

      const approved: { url: string; canonical: string }[] = [];
      for (const s of sources || []) {
        const check = checkUrl(s.url);
        if (!check.approved) {
          rejectedCount++;
          console.error(JSON.stringify({ event: "source_rejected", url: s.url, reason: check.reason }));
          continue;
        }
        approved.push({ url: s.url, canonical: check.canonical! });
      }

      const results = await Promise.all(approved.map(async (src) => {
        sourcesChecked++;
        try {
          const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ url: src.url, formats: ["markdown"], onlyMainContent: true }),
          });
          if (!response.ok) {
            console.error(JSON.stringify({ event: "scrape_failed", url: src.url, status: response.status }));
            return null;
          }
          const data = await response.json();
          const meta = data.data?.metadata || data.metadata || {};

          // A redirect that leaves the approved source is rejected outright.
          const finalUrl = meta.sourceURL || meta.url || src.url;
          const finalCheck = checkUrl(finalUrl);
          if (!finalCheck.approved) {
            rejectedCount++;
            console.error(JSON.stringify({ event: "redirect_rejected", from: src.url, to: finalUrl, reason: finalCheck.reason }));
            return null;
          }

          const markdown = data.data?.markdown || data.markdown || "";
          if (!markdown || markdown.length < 50) return null;

          return {
            canonicalUrl: finalCheck.canonical!,
            title: meta.title || src.url,
            publishedAt: meta.publishedTime || meta.modifiedTime || null,
            retrievedAt,
            content: sanitizeRetrievedContent(markdown, 1500),
          } as EvidenceItem;
        } catch (e) {
          console.error(JSON.stringify({ event: "scrape_error", url: src.url, error: String(e) }));
          return null;
        }
      }));

      for (const r of results) if (r) evidenceItems.push(r);
    }

    if (evidenceItems.length === 0) {
      return failClosed(corsHeaders, "no_valid_chunks", { sourcesChecked, rejectedCount, retrievedAt });
    }

    const context = evidenceItems
      .map((item) =>
        `[Source: ${item.canonicalUrl}]\n[Title: ${item.title}]\n[Published: ${item.publishedAt || "not stated"}]\n[Retrieved: ${item.retrievedAt}]\n${item.content}`
      )
      .join("\n\n---\n\n")
      .slice(0, 8000);

    const newestSourceTimestamp = evidenceItems
      .map((i) => i.publishedAt)
      .filter(Boolean)
      .sort()
      .pop() || null;

    console.log(JSON.stringify({
      event: "retrieval_ok",
      knowledge_domain: KNOWLEDGE_DOMAIN,
      sources_checked: sourcesChecked,
      retrieved_count: evidenceItems.length,
      rejected_url_count: rejectedCount,
      newest_evidence_at: newestSourceTimestamp,
      retrieved_at: retrievedAt,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        context,
        evidence: {
          knowledgeDomain: KNOWLEDGE_DOMAIN,
          retrievedCount: evidenceItems.length,
          sourcesChecked,
          rejectedCount,
          retrievedAt,
          newestSourceTimestamp,
          sources: evidenceItems.map((i) => ({
            canonicalUrl: i.canonicalUrl,
            title: i.title,
            publishedAt: i.publishedAt,
            retrievedAt: i.retrievedAt,
          })),
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Retrieval error:", error);
    return failClosed(getCorsHeaders(req), "unexpected_error", { sourcesChecked, rejectedCount, retrievedAt });
  }
});
