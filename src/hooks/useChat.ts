import { useState, useCallback } from 'react';
import { Message, UserTier, TIER_LIMITS, BLOCKED_CONTENT_KEYWORDS } from '@/types';

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
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

const VIOLATION_WINDOW_MS = 5 * 60 * 1000;
const COOLDOWN_DURATION_MS = 60 * 60 * 1000;

interface UseChatOptions {
  tier: UserTier;
  isAuthenticated: boolean;
  privyUserId?: string;
}

export function useChat({ tier, isAuthenticated, privyUserId }: UseChatOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [queriesUsedToday, setQueriesUsedToday] = useState(0);
  const [violations, setViolations] = useState<number[]>([]);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  
  const limits = TIER_LIMITS[tier];
  const queriesRemaining = limits.maxQueries - queriesUsedToday;
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

    // Check cooldown
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
    
    // Check for multiple questions
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

    // Check for content creation requests
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
      // Scrape context
      let context = '';
      try {
        const scrapeResponse = await fetch(SCRAPE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
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
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'x-privy-user-id': privyUserId,
        },
        body: JSON.stringify({
          messages: [...chatHistory, { role: 'user', content }],
          context,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
          throw new Error('Please sign in to use quackGPT');
        }
        if (response.status === 429) {
          throw new Error(errorData.error || 'Daily query limit reached');
        }
        throw new Error(errorData.error || 'Failed to get response');
      }
      
      if (!response.body) throw new Error('No response body');

      const serverMaxChars = parseInt(response.headers.get('X-Max-Characters') || String(limits.maxCharacters));
      const serverQueriesUsed = parseInt(response.headers.get('X-Queries-Used') || '0');
      const serverTier = response.headers.get('X-User-Tier') || tier;
      
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
      
      // Final truncation with tier indicator
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
  }, [messages, tier, queriesRemaining, limits.maxCharacters, violations, cooldownUntil, isAuthenticated, privyUserId]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isTyping,
    queriesUsedToday,
    queriesRemaining,
    sendMessage,
    clearMessages,
    cooldownUntil,
    isOnCooldown,
  };
}
