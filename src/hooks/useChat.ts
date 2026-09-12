import { useCallback, useEffect, useState } from 'react';
import { BLOCKED_CONTENT_KEYWORDS, EvidenceSource, MAX_RESPONSE_CHARACTERS, Message } from '@/types';

const RETRIEVE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scrape-sources`;
const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
const VERIFY_TEXT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-text`;
const STORAGE_KEY = 'quackgpt-local-chat';
const UNAVAILABLE_MESSAGE = 'SOME INFORMATION IS UNVERIFIED. No verified Ugly Duck Society source is available right now, so I cannot answer this. Please try again later.';

export type AssistantMode = 'search' | 'quack-check' | 'verify-text';

interface RetrievedEvidence {
  context: string;
  evidence: {
    retrievedCount: number;
    sourcesChecked?: number;
    rejectedCount?: number;
    retrievedAt?: string;
    newestSourceTimestamp?: string | null;
    sources?: EvidenceSource[];
  };
}

function generateId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isContentCreationRequest(text: string): boolean {
  const lower = text.toLowerCase();
  return BLOCKED_CONTENT_KEYWORDS.some((keyword) => lower.includes(keyword.toLowerCase()));
}

function loadLocalMessages(): Message[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<Omit<Message, 'timestamp'> & { timestamp: string }>;
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(-60).map((message) => ({ ...message, timestamp: new Date(message.timestamp) }));
  } catch {
    return [];
  }
}

const publicHeaders = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
};

export function useChat() {
  const [messages, setMessages] = useState<Message[]>(loadLocalMessages);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-60)));
    } catch {
      // Browser storage may be unavailable; the chat still works for this page view.
    }
  }, [messages]);

  const retrieveEvidence = useCallback(async (query: string): Promise<RetrievedEvidence | null> => {
    try {
      const response = await fetch(RETRIEVE_URL, {
        method: 'POST',
        headers: publicHeaders,
        body: JSON.stringify({ query }),
      });
      if (!response.ok) return null;
      const data = await response.json();
      if (!data.success || !data.context) return null;
      return { context: data.context, evidence: data.evidence || { retrievedCount: 0 } };
    } catch {
      return null;
    }
  }, []);

  const sendMessage = useCallback(async (content: string, mode: AssistantMode = 'search') => {
    const userMessage: Message = { id: generateId(), role: 'user', content, timestamp: new Date() };

    if (isContentCreationRequest(content)) {
      setMessages((previous) => [...previous, userMessage, {
        id: generateId(), role: 'assistant', content: '', timestamp: new Date(), isBlocked: true,
        blockReason: 'Content creation requests are not supported. quackGPT only provides factual information from official Ugly Duck Society sources.',
      }]);
      return;
    }

    const history = messages.slice(-12).map(({ role, content: messageContent }) => ({ role, content: messageContent }));
    setMessages((previous) => [...previous, userMessage]);
    setIsTyping(true);

    try {
      const retrieved = await retrieveEvidence(content);
      if (!retrieved) {
        setMessages((previous) => [...previous, { id: generateId(), role: 'assistant', content: UNAVAILABLE_MESSAGE, timestamp: new Date() }]);
        return;
      }

      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: publicHeaders,
        body: JSON.stringify({
          messages: [...history, { role: 'user', content }],
          context: retrieved.context,
          evidence: retrieved.evidence,
          mode,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || (response.status === 429 ? 'Too many requests. Please wait a moment.' : 'Unable to answer right now.'));
      }
      if (!response.body) throw new Error('Unable to answer right now.');

      const assistantId = generateId();
      setMessages((previous) => [...previous, {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        sources: retrieved.evidence.sources || [],
        retrievedAt: retrieved.evidence.retrievedAt ?? null,
      }]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let assistantContent = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });
        let newlineIndex = textBuffer.indexOf('\n');
        while (newlineIndex !== -1) {
          const line = textBuffer.slice(0, newlineIndex).replace(/\r$/, '');
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.startsWith('data: ') && line.slice(6).trim() !== '[DONE]') {
            try {
              const parsed = JSON.parse(line.slice(6));
              const delta = parsed.choices?.[0]?.delta?.content;
              if (typeof delta === 'string') {
                assistantContent = (assistantContent + delta).slice(0, MAX_RESPONSE_CHARACTERS);
                setMessages((previous) => previous.map((message) => message.id === assistantId ? { ...message, content: assistantContent } : message));
              }
            } catch {
              // Wait for the next complete event.
            }
          }
          newlineIndex = textBuffer.indexOf('\n');
        }
      }
    } catch (error) {
      setMessages((previous) => [...previous, {
        id: generateId(), role: 'assistant', content: error instanceof Error ? error.message : UNAVAILABLE_MESSAGE, timestamp: new Date(),
      }]);
    } finally {
      setIsTyping(false);
    }
  }, [messages, retrieveEvidence]);

  const sendVerifyText = useCallback(async (submittedText: string) => {
    const userMessage: Message = { id: generateId(), role: 'user', content: `[VERIFY TEXT] ${submittedText}`, timestamp: new Date() };
    setMessages((previous) => [...previous, userMessage]);
    setIsTyping(true);
    try {
      const retrieved = await retrieveEvidence(submittedText);
      if (!retrieved) throw new Error(UNAVAILABLE_MESSAGE);
      const response = await fetch(VERIFY_TEXT_URL, {
        method: 'POST',
        headers: publicHeaders,
        body: JSON.stringify({ submittedText: submittedText.trim(), context: retrieved.context, evidence: retrieved.evidence }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Verification is unavailable right now.');

      const icon = (verdict: string) => verdict === 'SUPPORTED' ? '✅' : verdict === 'UNSUPPORTED' ? '❌' : verdict === 'OUTDATED' ? '🕓' : '❓';
      let output = `## Text verification\n\n${data.summary || ''}\n\n`;
      if (data.claim_analysis?.length) {
        output += '### Claims\n';
        for (const claim of data.claim_analysis) {
          output += `${icon(claim.verdict)} **"${claim.claim}"** — ${claim.verdict}: ${claim.evidence}\n`;
          if (claim.source_url) output += `Source: ${claim.source_url} · Published: ${claim.published_at || 'not stated'}\n`;
          output += '\n';
        }
      }
      if (data.corrections?.length) {
        output += '### Factual corrections\n';
        for (const correction of data.corrections) {
          output += `- "${correction.incorrect_statement}" → ${correction.correction}`;
          if (correction.source_url) output += ` (Source: ${correction.source_url}${correction.published_at ? `, published ${correction.published_at}` : ''})`;
          output += '\n';
        }
      }
      setMessages((previous) => [...previous, {
        id: generateId(), role: 'assistant', content: output.trim().slice(0, MAX_RESPONSE_CHARACTERS), timestamp: new Date(),
        sources: retrieved.evidence.sources || [], retrievedAt: retrieved.evidence.retrievedAt ?? null,
      }]);
    } catch (error) {
      setMessages((previous) => [...previous, {
        id: generateId(), role: 'assistant', content: error instanceof Error ? error.message : UNAVAILABLE_MESSAGE, timestamp: new Date(),
      }]);
    } finally {
      setIsTyping(false);
    }
  }, [retrieveEvidence]);

  const clearMessages = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setMessages([]);
  }, []);

  return { messages, isTyping, sendMessage, sendVerifyText, clearMessages };
}