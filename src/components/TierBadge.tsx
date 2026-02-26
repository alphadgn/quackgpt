import { cn } from "@/lib/utils";
import { UserTier, TIER_LIMITS } from "@/types";
import { Crown, Sparkles, User } from "lucide-react";

interface TierBadgeProps {
  tier: UserTier;
  showLimits?: boolean;
  className?: string;
}

const tierConfig = {
  free: {
    label: 'Free',
    icon: User,
    className: 'bg-muted text-muted-foreground border-border',
  },
  nft_holder: {
    label: 'Quack Head',
    icon: Crown,
    className: 'bg-gradient-to-r from-primary/20 to-accent/20 text-primary border-primary/30',
  },
  paid: {
    label: 'Premium',
    icon: Sparkles,
    className: 'bg-gradient-to-r from-accent/20 to-primary/20 text-accent border-accent/30',
  },
};

export function TierBadge({ tier, showLimits = false, className }: TierBadgeProps) {
  const config = tierConfig[tier];
  const limits = TIER_LIMITS[tier];
  const Icon = config.icon;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border",
        config.className
      )}>
        <Icon className="w-3.5 h-3.5" />
        <span>{config.label}</span>
      </div>
      
      {showLimits && (
        <div className="text-xs text-muted-foreground space-y-0.5 pl-1">
          <p>{limits.maxQueries} query/day</p>
          <p>{limits.maxCharacters} characters max/query</p>
          {limits.maxImages > 0 && <p>{limits.maxImages} images/day</p>}
        </div>
      )}
    </div>
  );
}
