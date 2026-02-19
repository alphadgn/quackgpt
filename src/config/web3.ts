import { defineChain } from 'viem';
import { http, createConfig } from 'wagmi';

// ApeChain L3 definition
export const apeChain = defineChain({
  id: 33139,
  name: 'ApeChain',
  nativeCurrency: {
    name: 'ApeCoin',
    symbol: 'APE',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.apechain.com/http'],
      webSocket: ['wss://rpc.apechain.com/ws'],
    },
  },
  blockExplorers: {
    default: {
      name: 'ApeChain Explorer',
      url: 'https://apescan.io',
    },
  },
});

// Quack ecosystem contract addresses
export const CONTRACTS = {
  APECOIN: '0x4d224452801aced8b2f0aebe155379bb5d594381' as const,
  // Quack Heads NFT - placeholder, update with actual contract
  QUACK_HEADS_NFT: '0x0000000000000000000000000000000000000000' as const,
};

export const WALLETCONNECT_PROJECT_ID = '216e18457d4175d16510e212adf64c5d';
export const PRIVY_APP_ID = 'cmlsrxu7g008m0cjvtq5nqxo7';

export const wagmiConfig = createConfig({
  chains: [apeChain],
  transports: {
    [apeChain.id]: http(),
  },
});
