import { cn } from "@/lib/utils";
import { Message } from "@/types";
import { QuackLogo } from "./QuackLogo";
import { User, AlertTriangle } from "lucide-react";

interface ChatMessageProps {
  message: Message;
  className?: string;
}

export function ChatMessage({ message, className }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isBlocked = message.isBlocked;

  return (
    <div className={cn(
      "flex gap-4 py-6 px-4 animate-slide-up",
      isUser ? "bg-transparent" : "bg-secondary/30",
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
          <div className="text-foreground/90 leading-relaxed whitespace-pre-wrap">
            {message.content}
          </div>
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
