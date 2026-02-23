import { usePrivy } from '@privy-io/react-auth';
import { useAccount } from 'wagmi';
import { useMemo, useEffect, useState, useCallback } from 'react';
import { UserTier } from '@/types';
import { supabase } from '@/integrations/supabase/client';

// Shared global state for tierOverride so it persists across all useAuth() instances
let _globalTierOverride: UserTier | null = null;
const _tierListeners = new Set<(val: UserTier | null) => void>();

function _setGlobalTierOverride(val: UserTier | null) {
  _globalTierOverride = val;
  _tierListeners.forEach((cb) => cb(val));
}

export function useAuth() {
  const { ready, authenticated, user, login, logout, linkWallet, unlinkWallet, getAccessToken } = usePrivy();
  const { address, isConnected } = useAccount();
  const [isNftHolder, setIsNftHolder] = useState(false);
  const [nftCheckLoading, setNftCheckLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [tierOverride, _setLocalTierOverride] = useState<UserTier | null>(_globalTierOverride);

  // Sync local state from global broadcasts
  useEffect(() => {
    const handler = (val: UserTier | null) => _setLocalTierOverride(val);
    _tierListeners.add(handler);
    // Sync on mount in case global changed while unmounted
    _setLocalTierOverride(_globalTierOverride);
    return () => { _tierListeners.delete(handler); };
  }, []);

  const setTierOverride = useCallback((val: UserTier | null) => {
    _setGlobalTierOverride(val);
  }, []);

  // Get ALL linked wallets from Privy user
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

  const embeddedWallet = useMemo(() => {
    if (!user) return undefined;
    const embedded = user.linkedAccounts?.find(
      (account: any) => account.type === 'wallet' && account.walletClientType === 'privy'
    );
    return embedded as any;
  }, [user]);

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
        const token = await getAccessToken();
        if (!token) { if (!cancelled) setIsSubscribed(false); return; }
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-subscription`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'x-privy-token': token,
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
        const token = await getAccessToken();
        const { data, error } = await supabase.functions.invoke('verify-nft', {
          body: { walletAddress: solanaAddress },
          headers: {
            ...(token ? { 'x-privy-token': token } : {}),
          },
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
        const token = await getAccessToken();
        if (!token) { if (!cancelled) setIsSuperAdmin(false); return; }
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-admin`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'x-privy-token': token,
          },
        });
        const data = await resp.json();
        if (!cancelled) {
          const admin = data?.isSuperAdmin === true;
          setIsSuperAdmin(admin);
          // Hardwire: request notification permission on EVERY super admin sign-in
          if (admin && "Notification" in window) {
            if (Notification.permission === "granted") {
              // Already granted — nothing to prompt
            } else if (Notification.permission !== "denied") {
              Notification.requestPermission().then(p => {
                if (p === "granted") {
                  console.log("[QuackGPT] Notification permission granted for super admin");
                }
              });
            }
          }
        }
      } catch {
        if (!cancelled) setIsSuperAdmin(false);
      }
    })();

    return () => { cancelled = true; };
  }, [authenticated, user?.id]);

  // Clear tier override on logout
  useEffect(() => {
    if (!authenticated) {
      setTierOverride(null);
    }
  }, [authenticated]);

  const tier: UserTier = useMemo(() => {
    // Super admin tier override for testing
    if (isSuperAdmin && tierOverride) return tierOverride;
    if (!authenticated) return 'free';
    if (isNftHolder) return 'nft_holder';
    if (isSubscribed) return 'paid';
    return 'free';
  }, [authenticated, isNftHolder, isSubscribed, isSuperAdmin, tierOverride]);

  const handleLinkWallet = useCallback(() => {
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

  const handleUnlinkAllWeb3Wallets = useCallback(async () => {
    const allAccounts = (user?.linkedAccounts || []) as any[];
    const seen = new Set<string>();
    const toUnlink: string[] = [];
    for (const account of allAccounts) {
      const addr = account.address;
      if (!addr) continue;
      const key = addr.toLowerCase();
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
    getAccessToken,
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
    tierOverride,
    setTierOverride,
  };
}
