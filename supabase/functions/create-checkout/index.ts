import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const ALLOWED_ORIGINS = [
  "https://quackgpt.lovable.app",
  "https://id-preview--6fc1b829-5793-476b-88f7-61e61a7d825c.lovable.app",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-privy-user-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

const PRICE_ID = "price_1T2TPyCkLIkaxa5Mj6DSmjNU";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("external_user_id", privyUserId)
      .single();

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    let customerId: string | undefined;
    const customers = await stripe.customers.search({
      query: `metadata["privy_user_id"]:"${privyUserId}"`,
    });

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;

      const subs = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 1,
      });
      if (subs.data.length > 0) {
        return new Response(JSON.stringify({ error: "You already have an active subscription" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const origin = req.headers.get("origin") || ALLOWED_ORIGINS[0];

    const sessionParams: any = {
      line_items: [{ price: PRICE_ID, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/settings?checkout=success`,
      cancel_url: `${origin}/settings?checkout=cancelled`,
      metadata: { privy_user_id: privyUserId },
      subscription_data: {
        metadata: { privy_user_id: privyUserId },
      },
    };

    if (customerId) {
      sessionParams.customer = customerId;
    } else {
      const customer = await stripe.customers.create({
        metadata: { privy_user_id: privyUserId },
      });
      sessionParams.customer = customer.id;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return new Response(JSON.stringify({ error: "An unexpected error occurred" }), {
      status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
