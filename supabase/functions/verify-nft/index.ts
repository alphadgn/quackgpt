import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

const QUACK_HEADS_COLLECTION = 'HxSsfM9WxQWj79chAUNL6osZxQjJj5iMUwrjEfRBvYBR';

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { walletAddress } = await req.json();
    
    const verifiedUserId = await verifyPrivyToken(req);
    const rawPrivyUserId = req.headers.get('x-privy-user-id');
    
    let privyUserId: string | null = null;
    if (verifiedUserId) {
      privyUserId = verifiedUserId;
    } else if (rawPrivyUserId && /^did:privy:[a-zA-Z0-9]{1,50}$/.test(rawPrivyUserId)) {
      privyUserId = rawPrivyUserId;
    }

    if (!walletAddress || typeof walletAddress !== 'string' || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress)) {
      return new Response(
        JSON.stringify({ error: 'Valid walletAddress is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const heliusApiKey = Deno.env.get('HELIUS_API_KEY');
    if (!heliusApiKey) {
      return new Response(
        JSON.stringify({ error: 'Helius API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch(`https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'verify-nft',
        method: 'getAssetsByOwner',
        params: {
          ownerAddress: walletAddress,
          page: 1,
          limit: 1000,
          displayOptions: { showCollectionMetadata: true },
        },
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error('Helius API error:', data.error);
      return new Response(
        JSON.stringify({ isHolder: false, error: 'Failed to verify NFT ownership' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const assets = data.result?.items || [];

    const quackHeadsNFTs = assets.filter((asset: any) => {
      const grouping = asset.grouping || [];
      return grouping.some(
        (g: any) => g.group_key === 'collection' && g.group_value === QUACK_HEADS_COLLECTION
      );
    });

    const isHolder = quackHeadsNFTs.length > 0;

    if (privyUserId) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      const newTier = isHolder ? 'nft_holder' : 'free';
      
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('external_user_id', privyUserId)
        .single();

      if (existing) {
        await supabase
          .from('profiles')
          .update({ tier: newTier })
          .eq('external_user_id', privyUserId);
      } else {
        await supabase
          .from('profiles')
          .insert({ external_user_id: privyUserId, tier: newTier });
      }
    }

    return new Response(
      JSON.stringify({
        isHolder,
        count: quackHeadsNFTs.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error verifying NFT:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});
