import { usePrivy } from '@privy-io/react-auth';
import { useAccount } from 'wagmi';
import { useMemo } from 'react';
import { UserTier } from '@/types';

export function useAuth() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { address, isConnected } = useAccount();

  const tier: UserTier = useMemo(() => {
    if (!authenticated) return 'free';
    // TODO: Check on-chain for Quack Heads NFT ownership
    // For now, connected wallet = nft_holder tier as placeholder
    if (isConnected && address) return 'nft_holder';
    return 'paid';
  }, [authenticated, isConnected, address]);

  return {
    ready,
    authenticated,
    user,
    login,
    logout,
    walletAddress: address,
    isWalletConnected: isConnected,
    tier,
    email: user?.email?.address,
  };
}
