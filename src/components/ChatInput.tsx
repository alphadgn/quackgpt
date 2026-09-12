import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Send, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { BLOCKED_CONTENT_KEYWORDS } from "@/types";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  className?: string;
  prefillValue?: string;
  onPrefillConsumed?: () => void;
  selectionComplete?: boolean;
}

export function ChatInput({ onSend, disabled, className, prefillValue, onPrefillConsumed, selectionComplete = true }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [isBlocked, setIsBlocked] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle prefill from "Try asking" buttons
  useEffect(() => {
    if (prefillValue) {
      setValue(prefillValue);
      onPrefillConsumed?.();
      textareaRef.current?.focus();
    }
  }, [prefillValue, onPrefillConsumed]);

  // Check for blocked content keywords
  useEffect(() => {
    const lowerValue = value.toLowerCase();
    const blocked = BLOCKED_CONTENT_KEYWORDS.some(keyword => 
      lowerValue.includes(keyword.toLowerCase())
    );
    setIsBlocked(blocked);
  }, [value]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [value]);

  const handleSubmit = () => {
    if (!value.trim() || disabled || isBlocked) return;
    onSend(value.trim());
    setValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={cn("relative", className)}>
      {/* Blocked content warning */}
      {isBlocked && (
        <div className="absolute -top-16 left-0 right-0 flex items-center gap-2 px-4 py-2 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>🚫 quackGPT does not create content. It verifies reality.</span>
        </div>
      )}

      {/* Input container */}
      <div
        className={cn(
        "relative flex items-end gap-2 p-2 rounded-2xl border transition-all duration-300",
        !selectionComplete
          ? "border-border/30 bg-secondary/10 opacity-60 cursor-not-allowed"
          : isBlocked
              ? "border-destructive/50 bg-destructive/5" 
              : "border-primary/30 bg-secondary/30 focus-within:bg-secondary/50 focus-within:animate-none"
      )}
        style={!selectionComplete || isBlocked ? undefined : { borderColor: 'hsl(var(--primary) / 0.5)', boxShadow: 'var(--glow-primary)' }}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            !selectionComplete
              ? "Select a search mode above to begin..."
              : "Ask anything about Ugly Duck Society..."
          }
          disabled={disabled}
          rows={1}
          className={cn(
            "flex-1 bg-transparent resize-none border-0 outline-none text-foreground placeholder:text-primary/50 placeholder:animate-search-text-pulse px-3 py-2 max-h-[200px] text-sm leading-relaxed",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        />
        
        {(() => {
          const buttonDisabled = disabled || !value.trim() || isBlocked;
          const isActive = !buttonDisabled;
          return (
            <Button
              variant="send"
              size="icon"
              onClick={handleSubmit}
              disabled={buttonDisabled}
              className={cn(
                "shrink-0 transition-all duration-200 rounded-full overflow-hidden p-0",
                !isActive && "opacity-100"
              )}
            >
              <Send className={cn("w-4 h-4", !isActive && "opacity-50")} />
            </Button>
          );
        })()}
      </div>
      
    </div>
  );
}
