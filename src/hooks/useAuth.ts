import { usePrivy } from '@privy-io/react-auth';
import { useAccount } from 'wagmi';
import { useMemo, useEffect, useState, useCallback } from 'react';
import { UserTier } from '@/types';
import { supabase } from '@/integrations/supabase/client';

export function useAuth() {
  const { ready, authenticated, user, login, logout, linkWallet, unlinkWallet } = usePrivy();
  const { address, isConnected } = useAccount();
  const [isNftHolder, setIsNftHolder] = useState(false);
  const [nftCheckLoading, setNftCheckLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Get all linked wallets from Privy user
  const linkedWallets = useMemo(() => {
    if (!user) return [];
    return (user.linkedAccounts?.filter(
      (account: any) => account.type === 'wallet'
    ) || []) as Array<{ address: string; chainType: string }>;
  }, [user]);

  // Get embedded wallet from Privy user
  const embeddedWallet = useMemo(() => {
    if (!user) return undefined;
    const embedded = user.linkedAccounts?.find(
      (account: any) => account.type === 'wallet' && account.walletClientType === 'privy'
    );
    return embedded as any;
  }, [user]);

  // Get Solana wallet address from Privy user
  const solanaAddress = useMemo(() => {
    if (!user) return undefined;
    const solanaWallet = user.linkedAccounts?.find(
      (account: any) => account.type === 'wallet' && account.chainType === 'solana'
    );
    return (solanaWallet as any)?.address;
  }, [user]);

  // Check Stripe subscription status
  useEffect(() => {
    if (!authenticated || !user?.id) {
      setIsSubscribed(false);
      return;
    }

    let cancelled = false;
    setSubscriptionLoading(true);

    (async () => {
      try {
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-subscription`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'x-privy-user-id': user.id,
          },
        });
        const data = await resp.json();
        if (!cancelled) {
          setIsSubscribed(data?.subscribed === true);
        }
      } catch (err) {
        console.error('Subscription check failed:', err);
        if (!cancelled) setIsSubscribed(false);
      } finally {
        if (!cancelled) setSubscriptionLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [authenticated, user?.id]);

  // Verify Quack Heads NFT ownership on Solana
  useEffect(() => {
    if (!authenticated || !solanaAddress) {
      setIsNftHolder(false);
      return;
    }

    let cancelled = false;
    setNftCheckLoading(true);

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('verify-nft', {
          body: { walletAddress: solanaAddress },
          headers: { 'x-privy-user-id': user?.id || '' },
        });

        if (!cancelled) {
          setIsNftHolder(data?.isHolder === true);
        }
      } catch (err) {
        console.error('NFT verification failed:', err);
        if (!cancelled) setIsNftHolder(false);
      } finally {
        if (!cancelled) setNftCheckLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [authenticated, solanaAddress]);

  // Check super admin status
  useEffect(() => {
    if (!authenticated || !user?.id) {
      setIsSuperAdmin(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-admin`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'x-privy-user-id': user.id,
          },
        });
        const data = await resp.json();
        if (!cancelled) setIsSuperAdmin(data?.isSuperAdmin === true);
      } catch {
        if (!cancelled) setIsSuperAdmin(false);
      }
    })();

    return () => { cancelled = true; };
  }, [authenticated, user?.id]);

  const tier: UserTier = useMemo(() => {
    if (!authenticated) return 'free';
    if (isNftHolder) return 'nft_holder';
    if (isSubscribed) return 'paid';
    return 'free';
  }, [authenticated, isNftHolder, isSubscribed]);

  const handleLinkWallet = useCallback(() => {
    if (linkedWallets.length >= 3) return;
    linkWallet?.();
  }, [linkedWallets.length, linkWallet]);

  const handleUnlinkWallet = useCallback(async (address: string) => {
    try {
      await unlinkWallet(address);
    } catch (err) {
      console.error('Failed to unlink wallet:', err);
    }
  }, [unlinkWallet]);

  return {
    ready,
    authenticated,
    user,
    login,
    logout,
    walletAddress: address,
    solanaAddress,
    embeddedWallet,
    isWalletConnected: isConnected,
    tier,
    nftCheckLoading,
    isSubscribed,
    isSuperAdmin,
    email: user?.email?.address,
    linkedWallets,
    linkWallet: handleLinkWallet,
    unlinkWallet: handleUnlinkWallet,
  };
}
