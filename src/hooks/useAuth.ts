import { usePrivy } from '@privy-io/react-auth';
import { useAccount } from 'wagmi';
import { useMemo, useEffect, useState, useCallback } from 'react';
import { UserTier } from '@/types';
import { supabase } from '@/integrations/supabase/client';

export function useAuth() {
  const { ready, authenticated, user, login, logout, linkWallet } = usePrivy();
  const { address, isConnected } = useAccount();
  const [isNftHolder, setIsNftHolder] = useState(false);
  const [nftCheckLoading, setNftCheckLoading] = useState(false);

  // Get all linked wallets from Privy user
  const linkedWallets = useMemo(() => {
    if (!user) return [];
    return (user.linkedAccounts?.filter(
      (account: any) => account.type === 'wallet'
    ) || []) as Array<{ address: string; chainType: string }>;
  }, [user]);

  // Get Solana wallet address from Privy user
  const solanaAddress = useMemo(() => {
    if (!user) return undefined;
    const solanaWallet = user.linkedAccounts?.find(
      (account: any) => account.type === 'wallet' && account.chainType === 'solana'
    );
    return (solanaWallet as any)?.address;
  }, [user]);

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

  const tier: UserTier = useMemo(() => {
    if (!authenticated) return 'free';
    if (isNftHolder) return 'nft_holder';
    return 'paid';
  }, [authenticated, isNftHolder]);

  const handleLinkWallet = useCallback(() => {
    if (linkedWallets.length >= 3) return;
    linkWallet?.();
  }, [linkedWallets.length, linkWallet]);

  return {
    ready,
    authenticated,
    user,
    login,
    logout,
    walletAddress: address,
    solanaAddress,
    isWalletConnected: isConnected,
    tier,
    nftCheckLoading,
    email: user?.email?.address,
    linkedWallets,
    linkWallet: handleLinkWallet,
  };
}
