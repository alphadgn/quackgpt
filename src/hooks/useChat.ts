import { useState, useCallback } from 'react';
import { Message, UserTier, TIER_LIMITS, BLOCKED_CONTENT_KEYWORDS } from '@/types';

// Factual responses sourced from Wallchain docs, social media, and ecosystem data
const DEMO_RESPONSES: Record<string, string> = {
  'wallchain': 'Wallchain is a Web3 infrastructure protocol that powers InfoFi by enabling the tokenization of attention and information flows across decentralized networks.',
  'infofi': 'InfoFi is an emerging paradigm that tokenizes information and attention. Wallchain provides the core infrastructure layer enabling InfoFi applications and data monetization.',
  'gquack': 'gQuack is the governance token of the quack.xyz ecosystem, enabling holders to participate in protocol decisions and access premium features within the Wallchain network.',
  'quack heads': 'Quack Heads is the official NFT collection from quack.xyz. Holders receive enhanced access to quackGPT including higher query limits and character allowances.',
  'nft': 'Quack Heads NFTs are available on Magic Eden. Ownership grants 3 daily queries with 150-character responses and image generation capabilities.',
  'token': '$QUACK is the utility token powering the quack.xyz ecosystem. It enables governance participation, query boosts, and API access within the Wallchain infrastructure.',
  'what is': 'Wallchain is Web3 infrastructure for InfoFi—tokenizing attention and information. quack.xyz builds on Wallchain with gQuack governance and Quack Heads NFTs.',
  'how': 'Wallchain works by creating tokenized information flows. Users interact through quack.xyz apps, with NFT holders and token stakers receiving enhanced benefits.',
  'apecoin': 'quackGPT operates on ApeChain. NFT verification and tier management use ApeChain smart contracts for gas-efficient, transparent access control.',
  'apechain': 'ApeChain is the blockchain powering quackGPT smart contracts. It handles NFT ownership verification, daily query tracking, and tier-based access management.',
  'docs': 'Full Wallchain documentation is available at docs.wallchain.xyz/intro covering protocol architecture, InfoFi concepts, and integration guides.',
  'leaderboard': 'The Wallchain leaderboard at app.wallchain.xyz/leaderboards tracks top contributors and engagement metrics across the ecosystem.',
  'social': 'Follow @wallchain on Twitter/X for updates. Also active on Telegram (t.me/wallchain_xyz), Instagram, LinkedIn, YouTube, and TikTok.',
  'default': 'quackGPT provides verified information about Wallchain, InfoFi, and the quack.xyz ecosystem. Ask about tokens, NFTs, governance, or protocol details.',
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
  
  // Find matching demo response based on keywords from whitelisted sources
  let response = DEMO_RESPONSES['default'];
  
  // Priority matching for more specific queries first
  const priorityKeys = ['wallchain', 'infofi', 'gquack', 'quack heads', 'nft', 'token', 'apecoin', 'apechain', 'docs', 'leaderboard', 'social', 'what is', 'how'];
  
  for (const key of priorityKeys) {
    if (lowerQuery.includes(key)) {
      response = DEMO_RESPONSES[key];
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
