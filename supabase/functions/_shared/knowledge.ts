// ==========================================================================
// Ugly Duck Society knowledge domain — shared, dependency-free helpers.
// Imported by edge functions AND by the vitest suite, so this file must not
// use any Deno-only or browser-only APIs.
// ==========================================================================

/** Internal knowledge_domain identifier. NEVER displayed to users. */
export const KNOWLEDGE_DOMAIN = "ugly_duck_society";

/** Internal-only domains. Never used to answer a live request. */
export const LEGACY_DOMAIN = "legacy_archive";
export const QUARANTINE_DOMAIN = "quarantine";

export type SourceFamily = "website" | "instagram" | "x";

interface ApprovedSource {
  family: SourceFamily;
  /** Exact hostnames (after stripping a leading "www."). No suffix matching. */
  hosts: string[];
  /** Required first path segment, lowercased. Empty = any path. */
  handle: string;
  canonicalRoot: string;
}

/**
 * The ONLY three source families that may ever be ingested, retrieved or cited.
 * Anything else — including lookalike domains and other social accounts —
 * is rejected.
 */
export const APPROVED_SOURCES: ApprovedSource[] = [
  {
    family: "website",
    hosts: ["uglyducksociety.tech"],
    handle: "",
    canonicalRoot: "https://uglyducksociety.tech",
  },
  {
    family: "instagram",
    hosts: ["instagram.com"],
    handle: "uglyducksociety",
    canonicalRoot: "https://www.instagram.com/uglyducksociety",
  },
  {
    family: "x",
    hosts: ["x.com", "twitter.com", "mobile.twitter.com"],
    handle: "uglyducklabz",
    canonicalRoot: "https://x.com/uglyducklabz",
  },
];

export type RejectionReason =
  | "malformed_url"
  | "insecure_scheme"
  | "unapproved_host"
  | "unapproved_handle";

export interface UrlCheck {
  approved: boolean;
  family?: SourceFamily;
  normalized?: string;
  canonical?: string;
  reason?: RejectionReason;
}

/**
 * Normalize a URL for allowlist checks, deduplication and idempotency:
 * lowercase host, drop scheme, drop "www.", drop trailing slashes,
 * drop query strings and fragments, drop tracking noise.
 */
export function normalizeUrl(raw: string): string | null {
  if (typeof raw !== "string" || raw.trim().length === 0) return null;
  let candidate = raw.trim();
  if (!/^https?:\/\//i.test(candidate)) candidate = `https://${candidate}`;
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return null;
  }
  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  const path = parsed.pathname.replace(/\/+$/, "");
  return `${host}${path}`.toLowerCase();
}

/** Strict allowlist check. Runs AFTER normalization, on exact host match. */
export function checkUrl(raw: string): UrlCheck {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return { approved: false, reason: "malformed_url" };
  }
  const trimmed = raw.trim();
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) && !/^https?:\/\//i.test(trimmed)) {
    return { approved: false, reason: "insecure_scheme" };
  }
  const normalized = normalizeUrl(trimmed);
  if (!normalized) return { approved: false, reason: "malformed_url" };

  const [host, ...segments] = normalized.split("/");
  const source = APPROVED_SOURCES.find((s) => s.hosts.includes(host));
  if (!source) return { approved: false, normalized, reason: "unapproved_host" };

  if (source.handle) {
    const firstSegment = (segments[0] || "").toLowerCase();
    if (firstSegment !== source.handle) {
      return { approved: false, normalized, reason: "unapproved_handle" };
    }
  }

  return {
    approved: true,
    family: source.family,
    normalized,
    canonical: canonicalizeUrl(normalized, source),
  };
}

function canonicalizeUrl(normalized: string, source: ApprovedSource): string {
  const [, ...segments] = normalized.split("/");
  const path = segments.filter(Boolean).join("/");
  if (source.family === "website") {
    return path ? `${source.canonicalRoot}/${path}` : source.canonicalRoot;
  }
  const rest = segments.slice(1).filter(Boolean).join("/");
  return rest ? `${source.canonicalRoot}/${rest}` : source.canonicalRoot;
}

/** True only when the URL belongs to one of the three approved source families. */
export function isApprovedUrl(raw: string): boolean {
  return checkUrl(raw).approved;
}

/**
 * A crawler may only follow links that stay inside the SAME approved source.
 */
export function isSameApprovedSource(fromUrl: string, toUrl: string): boolean {
  const a = checkUrl(fromUrl);
  const b = checkUrl(toUrl);
  return !!(a.approved && b.approved && a.family === b.family);
}

/** Crawl guardrails. */
export const CRAWL_LIMITS = { maxDepth: 2, maxPages: 40 } as const;

/**
 * Retrieved content is UNTRUSTED DATA. Neutralize instruction-shaped text so
 * crawled pages can never steer the model, and strip image noise.
 */
export function sanitizeRetrievedContent(input: string, maxChars = 4000): string {
  if (typeof input !== "string") return "";
  const injectionPatterns: RegExp[] = [
    /ignore (all |any |the )?(previous|prior|above|earlier) (instructions?|prompts?|rules?)/gi,
    /disregard (all |any |the )?(previous|prior|above|earlier) (instructions?|prompts?|rules?)/gi,
    /you are now\b/gi,
    /forget (everything|all) (you|previous)/gi,
    /\bsystem prompt\b/gi,
    /\bdeveloper mode\b/gi,
    /\bjailbreak\b/gi,
    /<\s*\/?\s*(system|assistant|user)\s*>/gi,
    /^\s*(system|assistant)\s*:/gim,
    /\bact as (an? )?(ai|assistant|admin|developer)\b/gi,
    /\breveal (your )?(instructions|prompt|api key|secret)\b/gi,
  ];
  let out = input
    .replace(/<Base64-Image-Removed>/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/https?:\/\/[^\s)]+\.(png|jpe?g|gif|svg|webp|ico)[^\s)]*/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ");
  for (const pattern of injectionPatterns) {
    out = out.replace(pattern, "[removed]");
  }
  return out.replace(/\s{3,}/g, "\n").trim().slice(0, maxChars);
}

/** Standard user-facing strings. */
export const UNVERIFIED_MESSAGE = "SOME INFORMATION IS UNVERIFIED.";
export const OUT_OF_SCOPE_MESSAGE =
  "OUT OF SCOPE — I only cover Ugly Duck Society.";
export const UNAVAILABLE_MESSAGE =
  "SOME INFORMATION IS UNVERIFIED. No verified Ugly Duck Society source is available right now, so I cannot answer this. Please try again later.";
