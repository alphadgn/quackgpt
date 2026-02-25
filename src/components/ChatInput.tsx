import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Send, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserTier, TIER_LIMITS, BLOCKED_CONTENT_KEYWORDS } from "@/types";
import { toast } from "sonner";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  tier: UserTier;
  queriesRemaining: number;
  className?: string;
  prefillValue?: string;
  onPrefillConsumed?: () => void;
  cooldownUntil?: number | null;
  privyUserId?: string | null;
  selectionComplete?: boolean;
}

export function ChatInput({ onSend, disabled, tier, queriesRemaining, className, prefillValue, onPrefillConsumed, cooldownUntil, privyUserId, selectionComplete = true }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [isBlocked, setIsBlocked] = useState(false);
  const [showDepletedOverlay, setShowDepletedOverlay] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();
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

  // Auto-hide depleted overlay after 4 seconds
  useEffect(() => {
    if (showDepletedOverlay) {
      const timer = setTimeout(() => setShowDepletedOverlay(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [showDepletedOverlay]);

  const isOnCooldown = cooldownUntil != null && Date.now() < cooldownUntil;
  const isLoadingUsage = queriesRemaining < 0;

  const handleSubmit = () => {
    if (!value.trim() || disabled || isBlocked || queriesRemaining <= 0 || isOnCooldown || isLoadingUsage) return;
    onSend(value.trim());
    setValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isDepleted = queriesRemaining <= 0 && !isLoadingUsage;
  const isDisabled = disabled || queriesRemaining <= 0 || isOnCooldown || isLoadingUsage;

  const handleDepletedClick = () => {
    if (isDepleted) {
      setShowDepletedOverlay(true);
    }
  };

  const handleCheckout = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!privyUserId) {
      navigate("/settings");
      return;
    }
    setCheckoutLoading(true);
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
      });
      const data = await resp.json();
      if (data.url) {
        const w = window.open(data.url, '_blank');
        if (!w) window.location.href = data.url;
      } else {
        toast.error(data.error || "Failed to create checkout session");
      }
    } catch {
      toast.error("Failed to start checkout");
    } finally {
      setCheckoutLoading(false);
    }
  };

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
      <div
        onClick={isDepleted ? handleDepletedClick : undefined}
        className={cn(
        "relative flex items-end gap-2 p-2 rounded-2xl border transition-all duration-300",
        !selectionComplete
          ? "border-border/30 bg-secondary/10 opacity-60 cursor-not-allowed"
          : isDepleted
            ? "border-destructive/50 bg-destructive/5 cursor-pointer"
            : isBlocked || isOnCooldown
              ? "border-destructive/50 bg-destructive/5" 
              : "border-primary/30 bg-secondary/30 animate-search-glow focus-within:border-primary/50 focus-within:bg-secondary/50 focus-within:shadow-[0_0_30px_hsl(42_92%_58%_/_0.15)] focus-within:animate-none"
      )}>
        {/* Depleted overlay notification */}
        {showDepletedOverlay && isDepleted && (
          <div className="absolute inset-0 z-10 flex items-center justify-between px-4 rounded-2xl bg-destructive/95 backdrop-blur-sm animate-fade-in">
            <div className="flex items-center gap-2 text-destructive-foreground text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Daily queries depleted — upgrade to continue</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCheckout}
              disabled={checkoutLoading}
              className="shrink-0 bg-destructive-foreground text-destructive hover:bg-destructive-foreground/90 border-none gap-1"
            >
              {checkoutLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              Subscribe
            </Button>
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => !isDepleted && setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={isDepleted ? (e) => { e.target.blur(); handleDepletedClick(); } : undefined}
          onClick={isDepleted ? handleDepletedClick : undefined}
          placeholder={
            !selectionComplete
              ? "Select a search mode & ecosystem above to begin..."
              : isLoadingUsage
                ? "Loading usage data..."
                : isOnCooldown
                  ? `Cooldown active — ${cooldownMinutes} min remaining...`
                  : queriesRemaining <= 0 
                    ? "Daily query limit reached..." 
                    : "Ask about Wallchain, InfoFi, or Quack Heads..."
          }
          disabled={isDisabled && !isDepleted}
          readOnly={isDepleted}
          rows={1}
          className={cn(
            "flex-1 bg-transparent resize-none border-0 outline-none text-foreground placeholder:text-primary/50 placeholder:animate-search-text-pulse px-3 py-2 max-h-[200px] text-sm leading-relaxed",
            isDepleted && "cursor-pointer opacity-50",
            isDisabled && !isDepleted && "opacity-50 cursor-not-allowed"
          )}
        />
        
        <Button
          variant="send"
          size="icon"
          onClick={isDepleted ? handleDepletedClick : handleSubmit}
          disabled={!isDepleted && (isDisabled || !value.trim() || isBlocked)}
          className={cn(
            "shrink-0 transition-all duration-200",
            !isDepleted && (!value.trim() || isBlocked) && "opacity-50"
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
          queriesRemaining === 0 && !isLoadingUsage && "text-destructive"
        )}>
          {isLoadingUsage ? "Loading…" : `${queriesRemaining}/${limits.maxQueries} queries remaining today`}
        </span>
      </div>
    </div>
  );
}
