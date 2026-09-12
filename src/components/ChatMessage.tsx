import { cn } from "@/lib/utils";
import { Message } from "@/types";
import { User, AlertTriangle, Link2 } from "lucide-react";
import { UGLY_DUCK_LOGO } from "@/lib/brand-assets";

interface ChatMessageProps {
  message: Message;
  className?: string;
}

export function ChatMessage({ message, className }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isBlocked = message.isBlocked;

  const sources = message.sources || [];

  return (
    <div
      className={cn(
        "flex gap-4 py-6 px-4 animate-slide-up",
        isUser ? "bg-transparent" : "bg-secondary/30",
        className
      )}
    >
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
          <img src={UGLY_DUCK_LOGO} alt="" className="h-full w-full rounded-lg object-cover" />
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
            <div className="text-foreground/90 leading-relaxed whitespace-pre-wrap break-words overflow-hidden">
              {message.content}
              {message.isTruncated && message.maxCharacters && (
                <span className="text-muted-foreground italic">
                   {` [Response truncated at ${message.maxCharacters} characters]`}
                </span>
              )}
            </div>

            {/* Citations: canonical source, publication time, retrieval time */}
            {!isUser && sources.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border/30 space-y-1">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Sources</p>
                {sources.map((s) => (
                  <div key={s.canonicalUrl} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                    <Link2 className="w-3 h-3 mt-0.5 shrink-0" />
                    <span className="min-w-0">
                      <a
                        href={s.canonicalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline break-all"
                      >
                        {s.canonicalUrl}
                      </a>
                      <span className="block">
                        Published: {s.publishedAt ? new Date(s.publishedAt).toLocaleString() : 'not stated'}
                        {' · '}
                        Retrieved: {s.retrievedAt ? new Date(s.retrievedAt).toLocaleString() : '—'}
                      </span>
                    </span>
                  </div>
                ))}
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
        <img src={UGLY_DUCK_LOGO} alt="" className="h-full w-full rounded-lg object-cover" />
      </div>
      
      <div className="flex items-center gap-1.5 pt-2">
        <div className="w-2 h-2 rounded-full bg-primary animate-typing-1" />
        <div className="w-2 h-2 rounded-full bg-primary animate-typing-2" />
        <div className="w-2 h-2 rounded-full bg-primary animate-typing-3" />
      </div>
    </div>
  );
}
