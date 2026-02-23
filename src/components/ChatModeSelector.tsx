import { useState, useCallback } from "react";
import { Search, Shield, Bird } from "lucide-react";
import { cn } from "@/lib/utils";

export type ChatMode = "search" | "quack-check" | "tweet-audit";

interface ChatModeSelectorProps {
  mode: ChatMode;
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
    <div className={cn("flex items-center gap-1 p-1 rounded-xl bg-secondary/30 border border-border/50", className)}>
      {modes.map((m) => (
        <button
          key={m.id}
          onClick={() => onModeChange(m.id)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
            mode === m.id
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
          )}
        >
          <m.icon className="w-3.5 h-3.5" />
          {m.label}
        </button>
      ))}
    </div>
  );
}
