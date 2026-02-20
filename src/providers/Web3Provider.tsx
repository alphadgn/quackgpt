import { PrivyProvider } from '@privy-io/react-auth';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PRIVY_APP_ID, apeChain, wagmiConfig } from '@/config/web3';

const queryClient = new QueryClient();

interface Web3ProviderProps {
  children: React.ReactNode;
}

export function Web3Provider({ children }: Web3ProviderProps) {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#D4A017',
          logo: undefined,
          walletChainType: 'ethereum-and-solana',
        },
        loginMethods: ['email', 'wallet'],
        defaultChain: apeChain,
        supportedChains: [apeChain],
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'users-without-wallets',
          },
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          {children}
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
