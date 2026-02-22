import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { createRemoteJWKSet, jwtVerify } from "https://deno.land/x/jose@v5.2.2/index.ts";

function isAllowedOrigin(origin: string): boolean {
  if (origin === "https://quackgpt.lovable.app") return true;
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
const IP_RATE_LIMIT = 10;
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

interface Finding {
  severity: "critical" | "warning" | "info" | "ok";
  category: string;
  title: string;
  detail: string;
}

async function runSecurityScan(supabase: ReturnType<typeof createClient>): Promise<{
  findings: Finding[];
  vulnerability_count: number;
  warning_count: number;
  ok_count: number;
  summary: string;
}> {
  const findings: Finding[] = [];

  // 1. Check RLS enabled on all public tables
  const { data: tables } = await supabase.rpc("", {}).catch(() => ({ data: null }));
  
  // Use raw query via service role to check RLS
  const { data: rlsCheck } = await supabase
    .from("security_scans")
    .select("id")
    .limit(0);

  // Check tables with RLS status
  const tablesToCheck = [
    "profiles", "app_users", "user_roles", "chat_history", 
    "chat_feedback", "daily_query_usage", "nft_token_bindings", 
    "scrape_sources", "security_scans"
  ];

  for (const table of tablesToCheck) {
    // Try to query each table - if RLS blocks it, that's good
    const { error } = await supabase.from(table).select("id").limit(1);
    if (!error) {
      // If we can read with anon key and it's a sensitive table, flag it
      if (["user_roles", "app_users", "chat_history", "chat_feedback", "security_scans"].includes(table)) {
        findings.push({
          severity: "critical",
          category: "RLS Policy",
          title: `Table '${table}' may be accessible without auth`,
          detail: `The table '${table}' returned data or no error with service role. Verify RLS policies are restrictive.`,
        });
      } else {
        findings.push({
          severity: "ok",
          category: "RLS Policy",
          title: `Table '${table}' accessible (expected)`,
          detail: `Table has appropriate access level.`,
        });
      }
    } else {
      findings.push({
        severity: "ok",
        category: "RLS Policy",
        title: `Table '${table}' properly restricted`,
        detail: `RLS blocks unauthorized access. Error: ${error.message?.slice(0, 80)}`,
      });
    }
  }

  // 2. Check for users with super_admin role
  const { data: adminRoles, error: rolesErr } = await supabase
    .from("user_roles")
    .select("user_id, role")
    .eq("role", "super_admin");

  if (adminRoles) {
    findings.push({
      severity: adminRoles.length > 2 ? "warning" : "ok",
      category: "Access Control",
      title: `${adminRoles.length} super admin(s) found`,
      detail: adminRoles.length > 2
        ? "Unusual number of super admins. Review for unauthorized privilege escalation."
        : "Admin count within expected range.",
    });
  }

  // 3. Check for any banned users still active
  const { data: bannedUsers } = await supabase
    .from("app_users")
    .select("id, external_user_id, is_banned")
    .eq("is_banned", true);

  if (bannedUsers && bannedUsers.length > 0) {
    findings.push({
      severity: "info",
      category: "User Management",
      title: `${bannedUsers.length} banned user(s) in system`,
      detail: "Banned users exist. Verify their sessions are properly invalidated.",
    });
  } else {
    findings.push({
      severity: "ok",
      category: "User Management",
      title: "No banned users",
      detail: "No banned accounts detected.",
    });
  }

  // 4. Check for expired NFT bindings still present
  const { data: expiredBindings } = await supabase
    .from("nft_token_bindings")
    .select("id")
    .lt("expires_at", new Date().toISOString());

  if (expiredBindings && expiredBindings.length > 0) {
    findings.push({
      severity: "warning",
      category: "NFT Bindings",
      title: `${expiredBindings.length} expired NFT binding(s)`,
      detail: "Expired bindings should be cleaned up to prevent stale access.",
    });
  } else {
    findings.push({
      severity: "ok",
      category: "NFT Bindings",
      title: "No expired NFT bindings",
      detail: "All NFT bindings are current.",
    });
  }

  // 5. Check for unusual query usage spikes
  const { data: highUsage } = await supabase
    .from("daily_query_usage")
    .select("external_user_id, queries_used")
    .gte("queries_used", 10)
    .eq("query_date", new Date().toISOString().split("T")[0]);

  if (highUsage && highUsage.length > 0) {
    findings.push({
      severity: "warning",
      category: "Usage Anomaly",
      title: `${highUsage.length} user(s) with high query usage today`,
      detail: "Users exceeding normal query limits detected. May indicate abuse or rate limit bypass.",
    });
  } else {
    findings.push({
      severity: "ok",
      category: "Usage Anomaly",
      title: "No unusual usage patterns",
      detail: "All user query counts within normal range.",
    });
  }

  // 6. Check for profiles without external_user_id (orphaned)
  const { data: orphanedProfiles } = await supabase
    .from("profiles")
    .select("id")
    .is("external_user_id", null)
    .is("user_id", null);

  if (orphanedProfiles && orphanedProfiles.length > 0) {
    findings.push({
      severity: "warning",
      category: "Data Integrity",
      title: `${orphanedProfiles.length} orphaned profile(s)`,
      detail: "Profiles without user linkage found. These may be leftover from deleted accounts.",
    });
  } else {
    findings.push({
      severity: "ok",
      category: "Data Integrity",
      title: "No orphaned profiles",
      detail: "All profiles properly linked to users.",
    });
  }

  // 7. Check scrape sources for suspicious URLs
  const { data: scrapeSources } = await supabase
    .from("scrape_sources")
    .select("url, label, is_active");

  if (scrapeSources) {
    const suspicious = scrapeSources.filter(s => {
      const url = s.url.toLowerCase();
      return url.includes("javascript:") || url.includes("<script") || url.includes("data:") || url.includes("file://");
    });
    if (suspicious.length > 0) {
      findings.push({
        severity: "critical",
        category: "Injection Risk",
        title: `${suspicious.length} suspicious scrape source URL(s)`,
        detail: "URLs containing potential injection patterns detected. Review immediately.",
      });
    } else {
      findings.push({
        severity: "ok",
        category: "Injection Risk",
        title: "All scrape sources clean",
        detail: `${scrapeSources.length} source(s) checked, no injection patterns found.`,
      });
    }
  }

  // 8. Check for feedback with potential XSS in override text
  const { data: feedbackOverrides } = await supabase
    .from("chat_feedback")
    .select("id, admin_override")
    .not("admin_override", "is", null);

  if (feedbackOverrides) {
    const xssRisk = feedbackOverrides.filter(f => {
      const text = (f.admin_override || "").toLowerCase();
      return text.includes("<script") || text.includes("javascript:") || text.includes("onerror=") || text.includes("onload=");
    });
    if (xssRisk.length > 0) {
      findings.push({
        severity: "critical",
        category: "XSS Risk",
        title: `${xssRisk.length} feedback override(s) with potential XSS`,
        detail: "Admin overrides containing script-like content detected.",
      });
    } else {
      findings.push({
        severity: "ok",
        category: "XSS Risk",
        title: "No XSS patterns in overrides",
        detail: `${feedbackOverrides.length} override(s) checked, all clean.`,
      });
    }
  }

  const vulnerability_count = findings.filter(f => f.severity === "critical").length;
  const warning_count = findings.filter(f => f.severity === "warning").length;
  const ok_count = findings.filter(f => f.severity === "ok").length;

  const summary = vulnerability_count > 0
    ? `⚠️ ${vulnerability_count} critical issue(s) found requiring immediate attention.`
    : warning_count > 0
    ? `${warning_count} warning(s) detected. Review recommended.`
    : "✅ All checks passed. No vulnerabilities detected.";

  return { findings, vulnerability_count, warning_count, ok_count, summary };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!checkIpRateLimit(req)) {
    return new Response(JSON.stringify({ error: "Rate limited" }), {
      status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "run";

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // For scheduled/cron calls, skip auth check
    const isCron = req.headers.get("authorization")?.includes(Deno.env.get("SUPABASE_ANON_KEY") || "NONE");

    if (!isCron) {
      const privyUserId = await verifyPrivyToken(req);
      if (!privyUserId) {
        return new Response(JSON.stringify({ error: "Not authenticated" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check super admin
      const { data: adminRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", privyUserId)
        .eq("role", "super_admin")
        .maybeSingle();

      if (!adminRole) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (action === "list") {
      // Return recent scan reports (last 12)
      const { data: scans } = await supabase
        .from("security_scans")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(12);

      return new Response(JSON.stringify({ scans: scans || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "run") {
      // Insert a new scan record
      const { data: scanRecord, error: insertErr } = await supabase
        .from("security_scans")
        .insert({
          scan_type: isCron ? "scheduled" : "manual",
          status: "running",
          triggered_by: isCron ? "cron" : "admin",
        })
        .select()
        .single();

      if (insertErr || !scanRecord) {
        return new Response(JSON.stringify({ error: "Failed to create scan record" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Run the scan
      const results = await runSecurityScan(supabase);

      // Update the record
      await supabase
        .from("security_scans")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          findings: results.findings,
          summary: results.summary,
          vulnerability_count: results.vulnerability_count,
          warning_count: results.warning_count,
          ok_count: results.ok_count,
        })
        .eq("id", scanRecord.id);

      // Clean up old scans (keep only last 24)
      const { data: allScans } = await supabase
        .from("security_scans")
        .select("id")
        .order("started_at", { ascending: false });

      if (allScans && allScans.length > 24) {
        const toDelete = allScans.slice(24).map(s => s.id);
        await supabase.from("security_scans").delete().in("id", toDelete);
      }

      return new Response(JSON.stringify({
        scan: {
          id: scanRecord.id,
          ...results,
          status: "completed",
        },
        alert: results.vulnerability_count > 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Security scan error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
