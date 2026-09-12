export const MAX_RESPONSE_CHARACTERS = 8000;

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
