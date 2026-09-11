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
    maxQueries: 1,
    maxCharacters: 100,
    maxImages: 0,
  },
  nft_holder: {
    maxQueries: 5, // Per verified NFT
    maxCharacters: 1000,
    maxImages: 5,
  },
  paid: {
    maxQueries: 3,
    maxCharacters: 300,
    maxImages: 3,
  },
};

export interface EvidenceSource {
  canonicalUrl: string;
  title?: string;
  publishedAt?: string | null;
  retrievedAt?: string | null;
}

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
  /** Canonical sources cited for this answer, with their timestamps. */
  sources?: EvidenceSource[];
  /** Retrieval timestamp for the evidence behind this answer. */
  retrievedAt?: string | null;
}

export interface ChatSession {
  id: string;
  messages: Message[];
  createdAt: Date;
}

/**
 * The only official Ugly Duck Society sources. Nothing outside this list is
 * ingested, retrieved or cited.
 */
export const APPROVED_SOURCES = [
  'https://uglyducksociety.tech',
  'https://www.instagram.com/uglyducksociety/',
  'https://x.com/uglyducklabz',
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
