import { cn } from "@/lib/utils";
import { GlowBracket } from "@/components/GlowBracket";

export type Campaign = "wallchain" | "idos" | "beyond";

interface CampaignSelectorProps {
  campaign: Campaign | null;
  onCampaignChange: (campaign: Campaign) => void;
  className?: string;
}

function IdosIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="2" />
      <rect x="8" y="8" width="8" height="8" rx="1.5" fill="currentColor" opacity="0.6" />
      <rect x="10" y="10" width="4" height="4" rx="0.5" fill="currentColor" />
    </svg>
  );
}

function BeyondIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
      <path d="M8 12c0-2.2 1.8-4 4-4s4 1.8 4 4-1.8 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

function WallchainIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <path d="M4 8l4 8 4-8 4 8 4-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const campaigns = [
  {
    id: "wallchain" as const,
    label: "Wallchain",
    icon: WallchainIcon,
    color: "text-amber-400",
    activeBg: "bg-amber-500/20 border-amber-500/40",
  },
  {
    id: "idos" as const,
    label: "idOS Network",
    icon: IdosIcon,
    color: "text-emerald-400",
    activeBg: "bg-emerald-500/20 border-emerald-500/40",
  },
  {
    id: "beyond" as const,
    label: "Beyond",
    icon: BeyondIcon,
    color: "text-orange-400",
    activeBg: "bg-orange-500/20 border-orange-500/40",
  },
];

export function CampaignSelector({ campaign, onCampaignChange, className, showPointers = false }: CampaignSelectorProps & { showPointers?: boolean }) {
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center justify-center gap-2">
        <span
          className={`text-xl transition-all duration-500 ${showPointers ? 'opacity-100 w-7' : 'opacity-0 w-0'}`}
          style={{ animation: showPointers ? 'horizontal-bounce-right 0.7s ease-in-out infinite' : 'none', overflow: 'hidden' }}
        >👉</span>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider text-center font-semibold">Select Ecosystem</p>
        <span
          className={`text-xl transition-all duration-500 ${showPointers ? 'opacity-100 w-7' : 'opacity-0 w-0'}`}
          style={{ animation: showPointers ? 'horizontal-bounce-left 0.7s ease-in-out infinite' : 'none', overflow: 'hidden' }}
        >👈</span>
      </div>
      <GlowBracket visible={showPointers} />
      <div className="flex flex-wrap sm:flex-nowrap gap-2 justify-center">
        {campaigns.map((c) => {
          const isActive = campaign === c.id;
          return (
            <button
              key={c.id}
              onClick={() => onCampaignChange(c.id)}
              className={cn(
                "flex-1 min-w-[90px] flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 sm:py-2.5 rounded-xl border text-[11px] sm:text-xs font-medium transition-all",
                isActive
                  ? cn(c.activeBg, c.color, "shadow-sm")
                  : "border-border/30 bg-card/30 text-muted-foreground hover:text-foreground hover:border-border/60"
              )}
            >
              <c.icon className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", isActive ? c.color : "")} />
              {c.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
