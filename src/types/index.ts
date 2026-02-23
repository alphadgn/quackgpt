export type UserTier = 'free' | 'nft_holder' | 'paid';

export interface User {
  id: string;
  email: string;
  tier: UserTier;
  walletAddress?: string;
  queriesUsedToday: number;
  lastQueryDate: string;
}

export interface TierLimits {
  maxQueries: number;
  maxCharacters: number;
  maxImages: number;
}

export const TIER_LIMITS: Record<UserTier, TierLimits> = {
  free: {
    maxQueries: 5,
    maxCharacters: 500,
    maxImages: 0,
  },
  nft_holder: {
    maxQueries: -1, // Unlimited
    maxCharacters: 5000,
    maxImages: 10,
  },
  paid: {
    maxQueries: 15,
    maxCharacters: 2000,
    maxImages: 5,
  },
};

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isBlocked?: boolean;
  blockReason?: string;
  isTruncated?: boolean;
  userTier?: UserTier;
  maxCharacters?: number;
}

export interface ChatSession {
  id: string;
  messages: Message[];
  createdAt: Date;
}

// Whitelisted data sources
export const WHITELISTED_SOURCES = [
  'https://docs.wallchain.xyz/intro',
  'https://news.wallchain.xyz/',
  'https://app.wallchain.xyz/leaderboards',
  '@wallchain (Twitter/X)',
  'https://t.me/wallchain_xyz',
  'https://www.instagram.com/wallchain_xyz/',
  'https://www.linkedin.com/company/wallchainco/',
  'https://m.youtube.com/@wallchain',
  'https://www.tiktok.com/@wallchain.xyz',
  'InfoFi datasets',
  'Quack Heads / gQuack / quack.xyz ecosystem',
] as const;

// Content creation keywords to block
export const BLOCKED_CONTENT_KEYWORDS = [
  'write a tweet',
  'create a thread',
  'draft an article',
  'marketing copy',
  'write a script',
  'create captions',
  'storytelling',
  'promotional',
  'write content',
  'generate text',
  'compose',
  'draft',
  'create copy',
] as const;
