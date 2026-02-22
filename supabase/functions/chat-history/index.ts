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

async function isSuperAdmin(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "super_admin")
    .maybeSingle();
  return !!data;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const privyUserId = await verifyPrivyToken(req);
    if (!privyUserId) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // --- SAVE: store a pair of messages (user + assistant) ---
    if (action === "save" && req.method === "POST") {
      const { sessionId, userContent, assistantContent } = await req.json();
      if (!sessionId || !userContent || !assistantContent) {
        return new Response(JSON.stringify({ error: "Missing fields" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await supabase.from("chat_history").insert([
        { external_user_id: privyUserId, role: "user", content: userContent, session_id: sessionId },
        { external_user_id: privyUserId, role: "assistant", content: assistantContent, session_id: sessionId },
      ]);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- LIST SESSIONS: get user's sessions (grouped) ---
    if (action === "list-sessions") {
      const isAdmin = await isSuperAdmin(supabase, privyUserId);
      const targetUser = url.searchParams.get("userId");

      // Admin can view any user; regular users see only their own (non-deleted)
      let query = supabase
        .from("chat_history")
        .select("session_id, created_at, content, role, user_deleted")
        .order("created_at", { ascending: true });

      if (isAdmin && targetUser) {
        query = query.eq("external_user_id", targetUser);
      } else {
        query = query.eq("external_user_id", privyUserId);
        if (!isAdmin) {
          query = query.eq("user_deleted", false);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      // Group by session_id
      const sessions: Record<string, { session_id: string; created_at: string; preview: string; messages: any[]; user_deleted: boolean }> = {};
      for (const row of data || []) {
        if (!sessions[row.session_id]) {
          sessions[row.session_id] = {
            session_id: row.session_id,
            created_at: row.created_at,
            preview: "",
            messages: [],
            user_deleted: row.user_deleted,
          };
        }
        sessions[row.session_id].messages.push({ role: row.role, content: row.content, created_at: row.created_at });
        if (row.role === "user" && !sessions[row.session_id].preview) {
          sessions[row.session_id].preview = row.content.substring(0, 100);
        }
      }

      const sessionList = Object.values(sessions).sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      return new Response(JSON.stringify({ sessions: sessionList }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- USER SOFT DELETE: marks session as user_deleted ---
    if (action === "user-delete" && req.method === "POST") {
      const { sessionId } = await req.json();
      if (!sessionId) {
        return new Response(JSON.stringify({ error: "sessionId required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await supabase
        .from("chat_history")
        .update({ user_deleted: true })
        .eq("external_user_id", privyUserId)
        .eq("session_id", sessionId);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- ADMIN HARD DELETE ---
    if (action === "admin-delete" && req.method === "POST") {
      const isAdmin = await isSuperAdmin(supabase, privyUserId);
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { sessionId } = await req.json();
      if (!sessionId) {
        return new Response(JSON.stringify({ error: "sessionId required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await supabase
        .from("chat_history")
        .delete()
        .eq("session_id", sessionId);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- ADMIN LIST ALL USERS with history ---
    if (action === "admin-list-users") {
      const isAdmin = await isSuperAdmin(supabase, privyUserId);
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data, error } = await supabase
        .from("chat_history")
        .select("external_user_id")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const uniqueUsers = [...new Set((data || []).map((d: any) => d.external_user_id))];
      return new Response(JSON.stringify({ users: uniqueUsers }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- LIST FEEDBACK for current user (or admin querying another user) ---
    if (action === "list-feedback") {
      const isAdminUser = await isSuperAdmin(supabase, privyUserId);
      const targetUser = url.searchParams.get("userId");
      const queryUserId = (isAdminUser && targetUser) ? targetUser : privyUserId;

      const { data, error } = await supabase
        .from("chat_feedback")
        .select("feedback_type, message_content, user_query, admin_reviewed, admin_override")
        .eq("external_user_id", queryUserId);
      if (error) throw error;
      return new Response(JSON.stringify({ feedback: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("chat-history error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
