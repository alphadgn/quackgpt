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

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
const SCRAPE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scrape-sources`;

export function useChat(tier: UserTier) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [queriesUsedToday, setQueriesUsedToday] = useState(0);
  
  const limits = TIER_LIMITS[tier];
  const queriesRemaining = limits.maxQueries - queriesUsedToday;

  const sendMessage = useCallback(async (content: string) => {
    if (queriesRemaining <= 0) return;
    
    // Check for content creation requests
    if (isContentCreationRequest(content)) {
      const userMessage: Message = {
        id: generateId(),
        role: 'user',
        content,
        timestamp: new Date(),
      };
      
      const blockedMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isBlocked: true,
        blockReason: 'Content creation requests are not supported. quackGPT only provides factual information from verified sources.',
      };
      
      setMessages(prev => [...prev, userMessage, blockedMessage]);
      return;
    }
    
    // Add user message
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);
    
    try {
      // First, try to scrape relevant context from whitelisted sources
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
      
      // Prepare chat history for AI
      const chatHistory = messages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));
      
      // Stream AI response
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...chatHistory, { role: 'user', content }],
          context,
          maxCharacters: limits.maxCharacters,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to get response');
      }
      
      if (!response.body) {
        throw new Error('No response body');
      }
      
      // Stream and parse response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let textBuffer = '';
      
      // Create assistant message placeholder
      const assistantId = generateId();
      setMessages(prev => [...prev, {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      }]);
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        textBuffer += decoder.decode(value, { stream: true });
        
        // Process SSE lines
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
              
              // Enforce character limit
              let displayContent = assistantContent;
              if (displayContent.length > limits.maxCharacters) {
                displayContent = displayContent.substring(0, limits.maxCharacters);
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
            // Partial JSON, continue buffering
          }
        }
      }
      
      // Final truncation to ensure limit
      let finalContent = assistantContent;
      if (finalContent.length > limits.maxCharacters) {
        finalContent = finalContent.substring(0, limits.maxCharacters);
      }
      
      setMessages(prev => 
        prev.map(msg => 
          msg.id === assistantId 
            ? { ...msg, content: finalContent }
            : msg
        )
      );
      
      setQueriesUsedToday(prev => prev + 1);
      
    } catch (error) {
      console.error('Chat error:', error);
      
      // Add error message
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsTyping(false);
    }
  }, [messages, tier, queriesRemaining, limits.maxCharacters]);

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
  };
}
