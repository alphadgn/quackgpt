import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { createRemoteJWKSet, jwtVerify } from "https://deno.land/x/jose@v5.2.2/index.ts";

const ALLOWED_ORIGINS = [
  "https://quackgpt.lovable.app",
  "https://id-preview--6fc1b829-5793-476b-88f7-61e61a7d825c.lovable.app",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-privy-user-id, x-privy-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

const PRICE_ID = "price_1T2TPyCkLIkaxa5Mj6DSmjNU";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const verifiedUserId = await verifyPrivyToken(req);
    const headerUserId = req.headers.get("x-privy-user-id");
    
    let privyUserId: string | null = null;
    if (verifiedUserId) {
      privyUserId = verifiedUserId;
      if (headerUserId && headerUserId !== verifiedUserId) {
        return new Response(JSON.stringify({ error: "User ID mismatch" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (headerUserId && /^did:privy:[a-zA-Z0-9]{1,50}$/.test(headerUserId)) {
      privyUserId = headerUserId;
    }

    if (!privyUserId) {
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
