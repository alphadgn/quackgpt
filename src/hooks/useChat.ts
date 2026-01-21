import { useState, useCallback } from 'react';
import { Message, UserTier, TIER_LIMITS, BLOCKED_CONTENT_KEYWORDS } from '@/types';

// Demo responses for the prototype
const DEMO_RESPONSES: Record<string, string> = {
  'wallchain': 'Wallchain is a Web3 protocol powering InfoFi.',
  'infofi': 'InfoFi tokenizes attention and information.',
  'gquack': 'gQuack is the governance token of quack.xyz.',
  'quack heads': 'Quack Heads are the official NFT collection.',
  'nft': 'Quack Heads NFTs grant premium access.',
  'token': '$QUACK is the ecosystem utility token.',
};

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function isContentCreationRequest(text: string): boolean {
  const lowerText = text.toLowerCase();
  return BLOCKED_CONTENT_KEYWORDS.some(keyword => 
    lowerText.includes(keyword.toLowerCase())
  );
}

function generateResponse(query: string, tier: UserTier): { content: string; isBlocked: boolean; blockReason?: string } {
  // Check for content creation requests
  if (isContentCreationRequest(query)) {
    return {
      content: '',
      isBlocked: true,
      blockReason: 'Content creation requests are not supported. quackGPT only provides factual information from verified sources.',
    };
  }
  
  const lowerQuery = query.toLowerCase();
  const limits = TIER_LIMITS[tier];
  
  // Find matching demo response
  let response = 'I can help with Wallchain ecosystem info.';
  
  for (const [key, value] of Object.entries(DEMO_RESPONSES)) {
    if (lowerQuery.includes(key)) {
      response = value;
      break;
    }
  }
  
  // Truncate to character limit
  if (response.length > limits.maxCharacters) {
    response = response.substring(0, limits.maxCharacters - 3) + '...';
  }
  
  return { content: response, isBlocked: false };
}

export function useChat(tier: UserTier) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [queriesUsedToday, setQueriesUsedToday] = useState(0);
  
  const limits = TIER_LIMITS[tier];
  const queriesRemaining = limits.maxQueries - queriesUsedToday;

  const sendMessage = useCallback(async (content: string) => {
    if (queriesRemaining <= 0) return;
    
    // Add user message
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
    
    // Generate response
    const { content: responseContent, isBlocked, blockReason } = generateResponse(content, tier);
    
    const assistantMessage: Message = {
      id: generateId(),
      role: 'assistant',
      content: responseContent,
      timestamp: new Date(),
      isBlocked,
      blockReason,
    };
    
    setMessages(prev => [...prev, assistantMessage]);
    setIsTyping(false);
    
    // Increment query count (blocked messages don't count)
    if (!isBlocked) {
      setQueriesUsedToday(prev => prev + 1);
    }
  }, [tier, queriesRemaining]);

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
