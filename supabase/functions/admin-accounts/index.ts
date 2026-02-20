import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-privy-user-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const privyUserId = req.headers.get("x-privy-user-id");
    if (!privyUserId || !/^did:privy:[a-zA-Z0-9]{1,50}$/.test(privyUserId)) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify the caller is a super_admin via user_roles table
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

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "list";

    if (action === "list") {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const today = new Date().toISOString().split("T")[0];
      const { data: usage } = await supabase
        .from("daily_query_usage")
        .select("*")
        .eq("query_date", today);

      const usageMap = new Map((usage || []).map(u => [u.external_user_id, u]));

      // Check NFT bindings for all users
      const { data: nftBindings } = await supabase
        .from("nft_token_bindings")
        .select("external_user_id")
        .gte("expires_at", new Date().toISOString());

      const nftHolderSet = new Set((nftBindings || []).map(b => b.external_user_id));

      // Derive real tier from Stripe + NFT, not stale DB column
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      let stripe: Stripe | null = null;
      if (stripeKey) {
        stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
      }

      const enriched = await Promise.all((profiles || []).map(async (p) => {
        let realTier = "free";

        if (nftHolderSet.has(p.external_user_id)) {
          realTier = "nft_holder";
        } else if (stripe && p.external_user_id) {
          try {
            const customers = await stripe.customers.search({
              query: `metadata["privy_user_id"]:"${p.external_user_id}"`,
              limit: 1,
            });
            if (customers.data.length > 0) {
              const subs = await stripe.subscriptions.list({
                customer: customers.data[0].id,
                status: "active",
                limit: 1,
              });
              if (subs.data.length > 0) {
                realTier = "paid";
              }
            }
          } catch (e) {
            console.error("Stripe check failed for", p.external_user_id, e);
          }
        }

        // Sync the DB if stale
        if (p.tier !== realTier) {
          await supabase
            .from("profiles")
            .update({ tier: realTier })
            .eq("external_user_id", p.external_user_id);
        }

        return {
          ...p,
          tier: realTier,
          todayUsage: usageMap.get(p.external_user_id)?.queries_used || 0,
        };
      }));

      return new Response(JSON.stringify({ accounts: enriched }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update-tier" && req.method === "POST") {
      const { targetUserId, newTier } = await req.json();
      if (!targetUserId || !["free", "paid", "nft_holder"].includes(newTier)) {
        return new Response(JSON.stringify({ error: "Invalid targetUserId or newTier" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabase
        .from("profiles")
        .update({ tier: newTier })
        .eq("external_user_id", targetUserId);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reset-usage" && req.method === "POST") {
      const { targetUserId } = await req.json();
      const today = new Date().toISOString().split("T")[0];

      const { error } = await supabase
        .from("daily_query_usage")
        .update({ queries_used: 0 })
        .eq("external_user_id", targetUserId)
        .eq("query_date", today);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Admin error:", error);
    return new Response(JSON.stringify({ error: "An unexpected error occurred" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
