import { Search, Shield, Bird } from "lucide-react";
import { cn } from "@/lib/utils";

export type ChatMode = "search" | "quack-check" | "tweet-audit";

interface ChatModeSelectorProps {
  mode: ChatMode | null;
  onModeChange: (mode: ChatMode) => void;
  className?: string;
}

const modes = [
  { id: "search" as const, label: "Search", icon: Search, description: "Ecosystem intelligence" },
  { id: "quack-check" as const, label: "Quack Check", icon: Shield, description: "Fact verification" },
  { id: "tweet-audit" as const, label: "Tweet Audit", icon: Bird, description: "Tweet scoring" },
];

export function ChatModeSelector({ mode, onModeChange, className }: ChatModeSelectorProps) {
  return (
    <div className={cn("flex items-center gap-2 p-1.5 rounded-2xl bg-secondary/30 border border-border/50 overflow-x-auto", className)}>
      {modes.map((m) => (
        <button
          key={m.id}
          onClick={() => onModeChange(m.id)}
          className={cn(
            "flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-sm sm:text-base font-semibold transition-all whitespace-nowrap",
            mode === m.id
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
          )}
        >
          <m.icon className="w-4 h-4 sm:w-5 sm:h-5" />
          {m.label}
        </button>
      ))}
    </div>
  );
}
