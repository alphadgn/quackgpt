import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Send, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserTier, TIER_LIMITS, BLOCKED_CONTENT_KEYWORDS } from "@/types";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  tier: UserTier;
  queriesRemaining: number;
  className?: string;
  prefillValue?: string;
  onPrefillConsumed?: () => void;
  cooldownUntil?: number | null;
}

export function ChatInput({ onSend, disabled, tier, queriesRemaining, className, prefillValue, onPrefillConsumed, cooldownUntil }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [isBlocked, setIsBlocked] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const limits = TIER_LIMITS[tier];

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

  const isOnCooldown = cooldownUntil != null && Date.now() < cooldownUntil;

  const handleSubmit = () => {
    if (!value.trim() || disabled || isBlocked || queriesRemaining <= 0 || isOnCooldown) return;
    onSend(value.trim());
    setValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isDisabled = disabled || queriesRemaining <= 0 || isOnCooldown;

  const cooldownMinutes = isOnCooldown ? Math.ceil((cooldownUntil! - Date.now()) / 60000) : 0;

  return (
    <div className={cn("relative", className)}>
      {/* Blocked content warning */}
      {isBlocked && (
        <div className="absolute -top-16 left-0 right-0 flex items-center gap-2 px-4 py-2 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>🚫 quackGPT does not create content. It verifies reality.</span>
        </div>
      )}

      {/* Cooldown warning */}
      {isOnCooldown && (
        <div className="absolute -top-16 left-0 right-0 flex items-center gap-2 px-4 py-2 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>⏳ Cooldown active — {cooldownMinutes} min remaining</span>
        </div>
      )}
      
      {/* Input container */}
      <div className={cn(
        "relative flex items-end gap-2 p-2 rounded-2xl border transition-all duration-300",
        isBlocked || isOnCooldown
          ? "border-destructive/50 bg-destructive/5" 
          : "border-border/50 bg-secondary/30 focus-within:border-primary/50 focus-within:bg-secondary/50 focus-within:shadow-[0_0_30px_hsl(42_92%_58%_/_0.15)]"
      )}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isOnCooldown
              ? `Cooldown active — ${cooldownMinutes} min remaining...`
              : queriesRemaining <= 0 
                ? "Daily query limit reached..." 
                : "Ask about Wallchain, InfoFi, or Quack Heads..."
          }
          disabled={isDisabled}
          rows={1}
          className={cn(
            "flex-1 bg-transparent resize-none border-0 outline-none text-foreground placeholder:text-muted-foreground px-3 py-2 max-h-[200px] text-sm leading-relaxed",
            isDisabled && "opacity-50 cursor-not-allowed"
          )}
        />
        
        <Button
          variant="send"
          size="icon"
          onClick={handleSubmit}
          disabled={isDisabled || !value.trim() || isBlocked}
          className={cn(
            "shrink-0 transition-all duration-200",
            (!value.trim() || isBlocked) && "opacity-50"
          )}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Character and query info */}
      <div className="flex items-center justify-between px-2 mt-2 text-xs text-muted-foreground">
        <span>
          Response limit: {limits.maxCharacters} characters
        </span>
        <span className={cn(
          queriesRemaining === 0 && "text-destructive"
        )}>
          {queriesRemaining}/{limits.maxQueries} queries remaining today
        </span>
      </div>
    </div>
  );
}
