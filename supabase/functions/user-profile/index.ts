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

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const privyUserId = await verifyPrivyToken(req);
    if (!privyUserId) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!/^[a-zA-Z0-9:_-]+$/.test(privyUserId)) {
      return new Response(JSON.stringify({ error: "Invalid user ID format" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "get";

    // ─── Client: get own profile ───
    if (action === "get") {
      const { data, error } = await supabase
        .from("app_users")
        .select("*")
        .eq("external_user_id", privyUserId)
        .single();

      if (error && error.code === "PGRST116") {
        // No profile yet — create one
        const { data: newProfile, error: insertError } = await supabase
          .from("app_users")
          .insert({ external_user_id: privyUserId })
          .select()
          .single();
        if (insertError) throw insertError;
        return new Response(JSON.stringify({ profile: newProfile }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (error) throw error;

      return new Response(JSON.stringify({ profile: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Client: update own profile (display_name, profile_picture_url) ───
    if (action === "update" && req.method === "POST") {
      const body = await req.json();
      const updates: Record<string, unknown> = {};

      if (typeof body.display_name === "string") {
        updates.display_name = body.display_name.trim().slice(0, 50);
      }
      if (typeof body.profile_picture_url === "string") {
        updates.profile_picture_url = body.profile_picture_url;
      }

      if (Object.keys(updates).length === 0) {
        return new Response(JSON.stringify({ error: "Nothing to update" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Upsert: create if not exists
      const { data: existing } = await supabase
        .from("app_users")
        .select("id")
        .eq("external_user_id", privyUserId)
        .single();

      if (!existing) {
        const { error: insertError } = await supabase
          .from("app_users")
          .insert({ external_user_id: privyUserId, ...updates });
        if (insertError) throw insertError;
      } else {
        const { error: updateError } = await supabase
          .from("app_users")
          .update(updates)
          .eq("external_user_id", privyUserId);
        if (updateError) throw updateError;
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Client: get upload URL for avatar ───
    if (action === "upload-avatar-url") {
      // Generate a signed upload URL for the user's avatar
      const fileName = `${privyUserId}/avatar-${Date.now()}.jpg`;
      
      return new Response(JSON.stringify({ 
        bucket: "avatars",
        path: fileName,
        publicUrl: `${Deno.env.get("SUPABASE_URL")}/storage/v1/object/public/avatars/${fileName}`,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Client: upload avatar (accepts base64 image) ───
    if (action === "upload-avatar" && req.method === "POST") {
      const body = await req.json();
      const { imageBase64, contentType } = body;

      if (!imageBase64 || !contentType) {
        return new Response(JSON.stringify({ error: "imageBase64 and contentType required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
      const fileName = `${privyUserId}/avatar-${Date.now()}.${ext}`;

      // Decode base64
      const binaryString = atob(imageBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Delete old avatars for this user
      const { data: existingFiles } = await supabase.storage
        .from("avatars")
        .list(privyUserId);

      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.map(f => `${privyUserId}/${f.name}`);
        await supabase.storage.from("avatars").remove(filesToDelete);
      }

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, bytes, { contentType, upsert: true });

      if (uploadError) throw uploadError;

      const publicUrl = `${Deno.env.get("SUPABASE_URL")}/storage/v1/object/public/avatars/${fileName}`;

      // Update profile with new avatar URL
      await supabase
        .from("app_users")
        .update({ profile_picture_url: publicUrl })
        .eq("external_user_id", privyUserId);

      return new Response(JSON.stringify({ success: true, url: publicUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══════════════════════════════════════════
    // ADMIN-ONLY ACTIONS (require super_admin role)
    // ═══════════════════════════════════════════
    const adminActions = ["admin-list", "admin-update", "admin-delete", "admin-ban"];
    if (adminActions.includes(action)) {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", privyUserId)
        .eq("role", "super_admin")
        .single();

      if (!roleData) {
        return new Response(JSON.stringify({ error: "Forbidden: super admin access required" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ─── Admin: list all users ───
      if (action === "admin-list") {
        const { data, error } = await supabase
          .from("app_users")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        return new Response(JSON.stringify({ users: data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ─── Admin: update a user profile ───
      if (action === "admin-update" && req.method === "POST") {
        const body = await req.json();
        const { targetUserId, display_name, email, notes, is_banned } = body;

        if (!targetUserId) {
          return new Response(JSON.stringify({ error: "targetUserId required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const updates: Record<string, unknown> = {};
        if (typeof display_name === "string") updates.display_name = display_name.trim().slice(0, 50);
        if (typeof email === "string") updates.email = email.trim().slice(0, 100);
        if (typeof notes === "string") updates.notes = notes.trim().slice(0, 500);
        if (typeof is_banned === "boolean") updates.is_banned = is_banned;

        if (Object.keys(updates).length === 0) {
          return new Response(JSON.stringify({ error: "Nothing to update" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Upsert
        const { data: existing } = await supabase
          .from("app_users")
          .select("id")
          .eq("external_user_id", targetUserId)
          .single();

        if (!existing) {
          const { error: insertError } = await supabase
            .from("app_users")
            .insert({ external_user_id: targetUserId, ...updates });
          if (insertError) throw insertError;
        } else {
          const { error: updateError } = await supabase
            .from("app_users")
            .update(updates)
            .eq("external_user_id", targetUserId);
          if (updateError) throw updateError;
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ─── Admin: delete a user profile ───
      if (action === "admin-delete" && req.method === "POST") {
        const body = await req.json();
        const { targetUserId } = body;

        if (!targetUserId) {
          return new Response(JSON.stringify({ error: "targetUserId required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Delete avatar files
        const { data: avatarFiles } = await supabase.storage
          .from("avatars")
          .list(targetUserId);
        if (avatarFiles && avatarFiles.length > 0) {
          await supabase.storage.from("avatars").remove(avatarFiles.map(f => `${targetUserId}/${f.name}`));
        }

        const { error } = await supabase
          .from("app_users")
          .delete()
          .eq("external_user_id", targetUserId);

        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ─── Admin: ban/unban a user ───
      if (action === "admin-ban" && req.method === "POST") {
        const body = await req.json();
        const { targetUserId, is_banned } = body;

        if (!targetUserId || typeof is_banned !== "boolean") {
          return new Response(JSON.stringify({ error: "targetUserId and is_banned required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { error } = await supabase
          .from("app_users")
          .update({ is_banned })
          .eq("external_user_id", targetUserId);

        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("User profile error:", error);
    return new Response(JSON.stringify({ error: "An unexpected error occurred" }), {
      status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
