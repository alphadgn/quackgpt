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

  // Get ALL linked wallets from Privy user — any account with an address field, fully deduplicated.
  // This intentionally casts a wide net so wallets stored in Privy but not being displayed
  // are still surfaced and can be unlinked.
  const linkedWallets = useMemo(() => {
    if (!user) return [];
    const seen = new Set<string>();
    const wallets: Array<{ address: string; chainType: string; walletClientType?: string }> = [];
    for (const account of (user.linkedAccounts || []) as any[]) {
      const addr = account.address;
      if (!addr) continue;
      const key = addr.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        wallets.push({
          address: addr,
          chainType: account.chainType || 'ethereum',
          walletClientType: account.walletClientType,
        });
      }
    }
    return wallets;
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
    // Count only actual wallet-type accounts (not emails or other linked accounts)
    const walletCount = (user?.linkedAccounts || []).filter(
      (a: any) => a.type === 'wallet'
    ).length;
    if (walletCount >= 3) return;
    linkWallet?.();
  }, [user?.linkedAccounts, linkWallet]);

  const handleUnlinkWallet = useCallback(async (address: string) => {
    try {
      await unlinkWallet(address);
    } catch (err) {
      console.error('Failed to unlink wallet:', err);
      throw err;
    }
  }, [unlinkWallet]);

  // Unlink ALL external (non-Privy-embedded) wallets.
  // Reads directly from user.linkedAccounts (raw source) to catch every stored wallet —
  // including any that might be hidden from the display list — so no ghost wallets remain.
  const handleUnlinkAllWeb3Wallets = useCallback(async () => {
    const allAccounts = (user?.linkedAccounts || []) as any[];
    const seen = new Set<string>();
    const toUnlink: string[] = [];
    for (const account of allAccounts) {
      const addr = account.address;
      if (!addr) continue;
      const key = addr.toLowerCase();
      // Skip the privy-embedded wallet
      if (account.walletClientType === 'privy') continue;
      if (!seen.has(key)) {
        seen.add(key);
        toUnlink.push(addr);
      }
    }
    for (const addr of toUnlink) {
      try {
        await unlinkWallet(addr);
      } catch (err) {
        console.error('Failed to unlink wallet:', addr, err);
      }
    }
  }, [user?.linkedAccounts, unlinkWallet]);

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
    unlinkAllWeb3Wallets: handleUnlinkAllWeb3Wallets,
  };
}

