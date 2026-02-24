import { useState, useCallback, useEffect, useRef } from 'react';
import { Message, UserTier, TIER_LIMITS, BLOCKED_CONTENT_KEYWORDS } from '@/types';

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function generateSessionId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${generateId()}-${generateId()}-${Date.now()}`;
}

function isContentCreationRequest(text: string): boolean {
  const lowerText = text.toLowerCase();
  return BLOCKED_CONTENT_KEYWORDS.some(keyword => 
    lowerText.includes(keyword.toLowerCase())
  );
}

function hasMultipleQuestions(text: string): boolean {
  const questionMarks = (text.match(/\?/g) || []).length;
  return questionMarks > 1;
}

const SCRAPE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scrape-sources`;
const CHECK_USAGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-usage`;

const VIOLATION_WINDOW_MS = 5 * 60 * 1000;
const COOLDOWN_DURATION_MS = 60 * 60 * 1000;
const CYCLE_DURATION_MS = 24 * 60 * 60 * 1000;

interface UseChatOptions {
  tier: UserTier;
  isAuthenticated: boolean;
  privyUserId?: string;
  getAccessToken?: () => Promise<string | null>;
  tierOverride?: UserTier | null;
  isSuperAdmin?: boolean;
}

export function useChat({ tier, isAuthenticated, privyUserId, getAccessToken, tierOverride, isSuperAdmin }: UseChatOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [queriesUsedToday, setQueriesUsedToday] = useState(0);
  const [violations, setViolations] = useState<number[]>([]);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [resetTime, setResetTime] = useState<number | null>(null);
  const [usageLoaded, setUsageLoaded] = useState(false);
  const sessionIdRef = useRef<string>(generateSessionId());

  // Helper to build auth headers (JWT only, no header fallback)
  const getAuthHeaders = useCallback(async () => {
    const token = getAccessToken ? await getAccessToken() : null;
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      ...(token ? { 'x-privy-token': token } : {}),
    };
  }, [getAccessToken]);

  // Fetch current usage from server on mount and when user changes
  useEffect(() => {
    if (!isAuthenticated || !privyUserId) {
      setQueriesUsedToday(0);
      setResetTime(null);
      setUsageLoaded(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const token = getAccessToken ? await getAccessToken() : null;
        if (!token) {
          // Token not ready yet — skip silently, will retry on next render
          if (!cancelled) setUsageLoaded(true);
          return;
        }
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'x-privy-token': token,
        };
        const body = (isSuperAdmin && tierOverride) ? JSON.stringify({ tierOverride }) : undefined;
        const resp = await fetch(CHECK_USAGE_URL, {
          method: body ? 'POST' : 'GET',
          headers,
          ...(body ? { body } : {}),
        });
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled) {
            setQueriesUsedToday(data.queriesUsed ?? 0);
            setResetTime(data.resetTime ?? null);
            setUsageLoaded(true);
          }
        }
      } catch (err) {
        console.error('Failed to fetch usage:', err);
        if (!cancelled) setUsageLoaded(true);
      }
    })();

    return () => { cancelled = true; };
  }, [isAuthenticated, privyUserId, getAuthHeaders, tierOverride, isSuperAdmin]);

  // Auto-reset queries when user's personal 24h countdown reaches zero
  useEffect(() => {
    if (!resetTime) return;
    const interval = setInterval(() => {
      if (Date.now() >= resetTime) {
        setQueriesUsedToday(0);
        setResetTime(null);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [resetTime]);

  const limits = TIER_LIMITS[tier];
  const queriesRemaining = limits.maxQueries === -1 ? 999 : limits.maxQueries - queriesUsedToday;
  const isOnCooldown = cooldownUntil !== null && Date.now() < cooldownUntil;

  const sendMessage = useCallback(async (content: string) => {
    if (!isAuthenticated || !privyUserId) {
      setMessages(prev => [...prev, 
        { id: generateId(), role: 'user', content, timestamp: new Date() },
        { id: generateId(), role: 'assistant', content: '', timestamp: new Date(), isBlocked: true,
          blockReason: 'Please sign in to use quackGPT.' }
      ]);
      return;
    }

    if (cooldownUntil && Date.now() < cooldownUntil) {
      const minutesLeft = Math.ceil((cooldownUntil - Date.now()) / 60000);
      setMessages(prev => [...prev, 
        { id: generateId(), role: 'user', content, timestamp: new Date() },
        { id: generateId(), role: 'assistant', content: '', timestamp: new Date(), isBlocked: true,
          blockReason: `You are on a ${minutesLeft}-minute cooldown due to repeated multi-question violations.` }
      ]);
      return;
    }

    if (queriesRemaining <= 0) return;
    
    if (hasMultipleQuestions(content)) {
      const now = Date.now();
      const recentViolations = [...violations.filter(t => now - t < VIOLATION_WINDOW_MS), now];
      setViolations(recentViolations);

      const userMessage: Message = { id: generateId(), role: 'user', content, timestamp: new Date() };
      
      if (recentViolations.length >= 3) {
        setCooldownUntil(now + COOLDOWN_DURATION_MS);
        setMessages(prev => [...prev, userMessage, {
          id: generateId(), role: 'assistant', content: '', timestamp: new Date(), isBlocked: true,
          blockReason: 'You have been placed on a 1-hour cooldown for repeatedly sending multiple questions at once.',
        }]);
      } else {
        setMessages(prev => [...prev, userMessage, {
          id: generateId(), role: 'assistant', content: '', timestamp: new Date(), isBlocked: true,
          blockReason: `Please ask only one question per query. (Warning ${recentViolations.length}/3)`,
        }]);
      }
      return;
    }

    if (isContentCreationRequest(content)) {
      const userMessage: Message = { id: generateId(), role: 'user', content, timestamp: new Date() };
      setMessages(prev => [...prev, userMessage, {
        id: generateId(), role: 'assistant', content: '', timestamp: new Date(),
        isBlocked: true, blockReason: 'Content creation requests are not supported. quackGPT only provides factual information from verified sources.',
      }]);
      return;
    }
    
    const userMessage: Message = { id: generateId(), role: 'user', content, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);
    
    try {
      const headers = await getAuthHeaders();
      
      // Scrape context
      let context = '';
      try {
        const scrapeResponse = await fetch(SCRAPE_URL, {
          method: 'POST',
          headers,
          body: JSON.stringify({ query: content }),
        });
        
        if (scrapeResponse.ok) {
          const scrapeData = await scrapeResponse.json();
          if (scrapeData.success && scrapeData.context) {
            context = scrapeData.context;
          }
        }
      } catch (scrapeError) {
        console.log('Scraping skipped:', scrapeError);
      }
      
      const chatHistory = messages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));
      
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: [...chatHistory, { role: 'user', content }],
          context,
          ...(isSuperAdmin && tierOverride ? { tierOverride } : {}),
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
          throw new Error('Please sign in to use quackGPT');
        }
        if (response.status === 429) {
          if (errorData.resetTime) {
            setResetTime(errorData.resetTime);
          }
          if (errorData.queriesUsed) {
            setQueriesUsedToday(errorData.queriesUsed);
          }
          throw new Error(errorData.error || 'Daily query limit reached');
        }
        throw new Error(errorData.error || 'Failed to get response');
      }
      
      if (!response.body) throw new Error('No response body');

      const serverMaxChars = parseInt(response.headers.get('X-Max-Characters') || String(limits.maxCharacters));
      const serverQueriesUsed = parseInt(response.headers.get('X-Queries-Used') || '0');
      const serverTier = response.headers.get('X-User-Tier') || tier;
      const serverResetTime = response.headers.get('X-Reset-Time');
      
      if (serverResetTime) {
        setResetTime(parseInt(serverResetTime));
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let textBuffer = '';
      
      const assistantId = generateId();
      setMessages(prev => [...prev, {
        id: assistantId, role: 'assistant', content: '', timestamp: new Date(),
      }]);
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        textBuffer += decoder.decode(value, { stream: true });
        
        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          
          try {
            const parsed = JSON.parse(jsonStr);
            const deltaContent = parsed.choices?.[0]?.delta?.content;
            if (deltaContent) {
              assistantContent += deltaContent;
              
              let displayContent = assistantContent;
              if (displayContent.length > serverMaxChars) {
                displayContent = displayContent.substring(0, serverMaxChars);
              }
              
              setMessages(prev => 
                prev.map(msg => 
                  msg.id === assistantId 
                    ? { ...msg, content: displayContent }
                    : msg
                )
              );
            }
          } catch {
            // Partial JSON
          }
        }
      }
      
      let finalContent = assistantContent;
      const wasTruncated = finalContent.length > serverMaxChars;
      if (wasTruncated) {
        finalContent = finalContent.substring(0, serverMaxChars);
      }

      setMessages(prev => 
        prev.map(msg => 
          msg.id === assistantId 
            ? { 
                ...msg, 
                content: finalContent,
                isTruncated: wasTruncated,
                userTier: serverTier as UserTier,
                maxCharacters: serverMaxChars,
              }
            : msg
        )
      );
      
      if (serverQueriesUsed > 0) {
        setQueriesUsedToday(serverQueriesUsed);
      } else {
        setQueriesUsedToday(prev => prev + 1);
      }

      // Persist to chat history
      try {
        const saveHeaders = await getAuthHeaders();
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-history?action=save`, {
          method: 'POST',
          headers: saveHeaders,
          body: JSON.stringify({
            sessionId: sessionIdRef.current,
            userContent: content,
            assistantContent: finalContent,
          }),
        });
      } catch (saveErr) {
        console.error('Failed to save chat history:', saveErr);
      }
      
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        id: generateId(), role: 'assistant',
        content: error instanceof Error ? error.message : 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsTyping(false);
    }
  }, [messages, tier, queriesRemaining, limits.maxCharacters, violations, cooldownUntil, isAuthenticated, privyUserId, getAuthHeaders, tierOverride, isSuperAdmin]);

  const sendTweetAudit = useCallback(async (tweetText: string) => {
    if (!isAuthenticated || !privyUserId) return;
    if (queriesRemaining <= 0) return;

    const userMessage: Message = { id: generateId(), role: 'user', content: tweetText, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      const headers = await getAuthHeaders();

      // Scrape context
      let context = '';
      try {
        const scrapeResp = await fetch(SCRAPE_URL, {
          method: 'POST',
          headers,
          body: JSON.stringify({ query: tweetText }),
        });
        if (scrapeResp.ok) {
          const scrapeData = await scrapeResp.json();
          if (scrapeData.success && scrapeData.context) context = scrapeData.context;
        }
      } catch { /* skip */ }

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tweet-audit`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ tweetText: tweetText.trim(), context }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'Audit failed');
      }

      const data = await resp.json();

      // Format result as markdown chat message
      const scoreEmoji = (s: number) => s >= 75 ? '🟢' : s >= 50 ? '🟡' : '🔴';
      let resultContent = `## 🦆 Tweet Integrity Score: ${scoreEmoji(data.composite_score)} ${data.composite_score}/100\n\n`;
      if (data.summary) resultContent += `${data.summary}\n\n`;
      resultContent += `### Score Breakdown\n`;
      resultContent += `- **Relevancy** (25%): ${data.relevancy_score}/100\n`;
      resultContent += `- **Correctness** (30%): ${data.correctness_score}/100\n`;
      resultContent += `- **Honesty** (25%): ${data.honesty_score}/100\n`;
      resultContent += `- **Brand Alignment** (20%): ${data.brand_alignment_score}/100\n\n`;

      if (data.claim_analysis?.length > 0) {
        resultContent += `### Claim Analysis\n`;
        for (const c of data.claim_analysis) {
          const icon = c.verdict === 'TRUE' ? '✅' : c.verdict === 'FALSE' ? '❌' : c.verdict === 'PARTIALLY_TRUE' ? '⚠️' : '❓';
          resultContent += `${icon} **"${c.claim}"** — ${c.explanation}\n\n`;
        }
      }

      if (data.risk_flags?.length > 0) {
        resultContent += `### ⚠️ Risk Flags\n`;
        for (const f of data.risk_flags) resultContent += `- ${f}\n`;
        resultContent += '\n';
      }

      if (data.suggested_improvements?.length > 0) {
        resultContent += `### 💡 Suggested Improvements\n`;
        for (const imp of data.suggested_improvements) resultContent += `- ${imp}\n`;
      }

      // Apply character truncation for tweet audit just like search/quack check
      let finalAuditContent = resultContent.trim();
      const auditMaxChars = limits.maxCharacters;
      const auditTruncated = finalAuditContent.length > auditMaxChars;
      if (auditTruncated) {
        finalAuditContent = finalAuditContent.substring(0, auditMaxChars);
      }

      setMessages(prev => [...prev, {
        id: generateId(), role: 'assistant', content: finalAuditContent, timestamp: new Date(),
        isTruncated: auditTruncated,
        userTier: tier,
        maxCharacters: auditMaxChars,
      }]);

      setQueriesUsedToday(prev => prev + 1);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: generateId(), role: 'assistant',
        content: error instanceof Error ? error.message : 'Tweet audit failed. Please try again.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsTyping(false);
    }
  }, [isAuthenticated, privyUserId, queriesRemaining, getAuthHeaders]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    sessionIdRef.current = generateSessionId();
  }, []);

  return {
    messages,
    isTyping,
    queriesUsedToday,
    queriesRemaining,
    sendMessage,
    sendTweetAudit,
    clearMessages,
    cooldownUntil,
    isOnCooldown,
    resetTime,
    usageLoaded,
  };
}
