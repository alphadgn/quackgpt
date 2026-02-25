import { cn } from "@/lib/utils";
import { Message } from "@/types";
import { QuackLogo } from "./QuackLogo";
import { User, AlertTriangle, ThumbsUp, ThumbsDown } from "lucide-react";
import { useState } from "react";

interface ChatMessageProps {
  message: Message;
  className?: string;
  onFeedback?: (messageContent: string, type: 'positive' | 'negative', userQuery?: string) => void;
  previousUserMessage?: Message;
}

const campaignStyles: Record<string, string> = {
  wallchain: 'bg-amber-500/20 border-l-4 border-l-amber-400',
  idos: 'bg-emerald-500/20 border-l-4 border-l-emerald-400',
  beyond: 'bg-orange-500/20 border-l-4 border-l-orange-400',
};

export function ChatMessage({ message, className, onFeedback, previousUserMessage }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isBlocked = message.isBlocked;
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null);

  // Use campaign from message directly, or inherit from previous user message for assistant replies
  const campaign = message.campaign || (!isUser ? previousUserMessage?.campaign : undefined);
  const campaignStyle = campaign ? campaignStyles[campaign] : '';

  const handleFeedback = (type: 'positive' | 'negative') => {
    if (feedback) return;
    setFeedback(type);
    onFeedback?.(message.content, type, previousUserMessage?.content);
  };

  // Build background: campaign style takes priority over defaults
  const bgClass = campaignStyle
    ? campaignStyle
    : isUser ? "bg-transparent" : "bg-secondary/30";

  return (
    <div className={cn(
      "flex gap-4 py-6 px-4 animate-slide-up",
      bgClass,
      className
    )}>
      {/* Avatar */}
      <div className={cn(
        "shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
        isUser 
          ? "bg-muted" 
          : isBlocked 
            ? "bg-destructive/20" 
            : "bg-gradient-to-br from-primary to-accent"
      )}>
        {isUser ? (
          <User className="w-4 h-4 text-muted-foreground" />
        ) : isBlocked ? (
          <AlertTriangle className="w-4 h-4 text-destructive" />
        ) : (
          <svg viewBox="0 0 100 100" className="w-5 h-5" fill="none">
            <circle cx="50" cy="45" r="28" fill="hsl(var(--primary-foreground))" />
            <ellipse cx="50" cy="58" rx="18" ry="10" fill="hsl(35 85% 50%)" />
            <ellipse cx="50" cy="55" rx="16" ry="8" fill="hsl(42 92% 58%)" />
            <circle cx="40" cy="40" r="5" fill="hsl(var(--background))" />
            <circle cx="60" cy="40" r="5" fill="hsl(var(--background))" />
            <circle cx="41" cy="39" r="2" fill="hsl(var(--foreground))" />
            <circle cx="61" cy="39" r="2" fill="hsl(var(--foreground))" />
          </svg>
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-foreground">
            {isUser ? 'You' : 'quackGPT'}
          </span>
          <span className="text-xs text-muted-foreground">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        
        {isBlocked ? (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
            <p className="text-destructive font-medium mb-2">
              🚫 quackGPT does not create content. It verifies reality.
            </p>
            {message.blockReason && (
              <p className="text-sm text-muted-foreground">
                {message.blockReason}
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="text-foreground/90 leading-relaxed whitespace-pre-wrap">
              {message.content}
              {message.isTruncated && message.maxCharacters && (
                <span className="text-muted-foreground italic">
                  {message.userTier === 'free'
                    ? `…………${message.maxCharacters} character free user limit`
                    : ` [Response truncated at ${message.maxCharacters} characters]`}
                </span>
              )}
            </div>
            
            {/* Feedback buttons - only on assistant messages */}
            {!isUser && message.content && (
              <div className="flex items-center gap-3 mt-3">
                <button
                  onClick={() => handleFeedback('positive')}
                  disabled={feedback !== null}
                  className={cn(
                    "flex items-center gap-1 text-xs transition-colors",
                    feedback === 'positive'
                      ? "text-primary"
                      : feedback === null
                        ? "text-muted-foreground hover:text-primary"
                        : "text-muted-foreground/40 cursor-default"
                  )}
                  title="👍 Stored to strengthen our databases"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleFeedback('negative')}
                  disabled={feedback !== null}
                  className={cn(
                    "flex items-center gap-1 text-xs transition-colors",
                    feedback === 'negative'
                      ? "text-destructive"
                      : feedback === null
                        ? "text-muted-foreground hover:text-destructive"
                        : "text-muted-foreground/40 cursor-default"
                  )}
                  title="👎 Used to refine our answers"
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                </button>
                {feedback && (
                  <span className="text-[10px] text-muted-foreground">
                    {feedback === 'positive' ? 'Thanks! Stored to strengthen our databases.' : 'Thanks! Used to refine our answers.'}
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Typing indicator component
export function TypingIndicator() {
  return (
    <div className="flex gap-4 py-6 px-4 bg-secondary/30">
      <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-primary to-accent">
        <svg viewBox="0 0 100 100" className="w-5 h-5" fill="none">
          <circle cx="50" cy="45" r="28" fill="hsl(var(--primary-foreground))" />
          <ellipse cx="50" cy="58" rx="18" ry="10" fill="hsl(35 85% 50%)" />
          <ellipse cx="50" cy="55" rx="16" ry="8" fill="hsl(42 92% 58%)" />
          <circle cx="40" cy="40" r="5" fill="hsl(var(--background))" />
          <circle cx="60" cy="40" r="5" fill="hsl(var(--background))" />
          <circle cx="41" cy="39" r="2" fill="hsl(var(--foreground))" />
          <circle cx="61" cy="39" r="2" fill="hsl(var(--foreground))" />
        </svg>
      </div>
      
      <div className="flex items-center gap-1.5 pt-2">
        <div className="w-2 h-2 rounded-full bg-primary animate-typing-1" />
        <div className="w-2 h-2 rounded-full bg-primary animate-typing-2" />
        <div className="w-2 h-2 rounded-full bg-primary animate-typing-3" />
      </div>
    </div>
  );
}
