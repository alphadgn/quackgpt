import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const QUACK_HEADS_COLLECTION = 'HxSsfM9WxQWj79chAUNL6osZxQjJj5iMUwrjEfRBvYBR';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { walletAddress } = await req.json();

    if (!walletAddress) {
      return new Response(
        JSON.stringify({ error: 'walletAddress is required' }),
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

    // Use Helius DAS API to get NFTs owned by the wallet
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

    // Check if any asset belongs to the Quack Heads collection
    const quackHeadsNFTs = assets.filter((asset: any) => {
      const grouping = asset.grouping || [];
      return grouping.some(
        (g: any) => g.group_key === 'collection' && g.group_value === QUACK_HEADS_COLLECTION
      );
    });

    const isHolder = quackHeadsNFTs.length > 0;

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
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
