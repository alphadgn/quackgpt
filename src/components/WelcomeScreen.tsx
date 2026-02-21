import { QuackLogo } from "./QuackLogo";
import { TierBadge } from "./TierBadge";
import { UserTier, WHITELISTED_SOURCES } from "@/types";
import { Database, Shield, Zap, ExternalLink, History } from "lucide-react";

interface WelcomeScreenProps {
  tier: UserTier;
  queriesRemaining: number;
  onQuerySelect?: (query: string) => void;
  isAuthenticated?: boolean;
  onLogin?: () => void;
  onOpenHistory?: () => void;
}

const features = [
  {
    icon: Database,
    title: "Source-Bound Intelligence",
    description: "All responses are derived exclusively from verified Wallchain sources.",
  },
  {
    icon: Shield,
    title: "No Content Creation",
    description: "quackGPT verifies reality—it does not create narratives or marketing content.",
  },
  {
    icon: Zap,
    title: "Ecosystem Knowledge",
    description: "Deep understanding of Wallchain, InfoFi, gQuack, and Quack Heads.",
  },
];

const exampleQueries = [
  "What is Wallchain?",
  "Explain InfoFi",
  "How do Quacks work?",
  "What are Quack Heads NFTs?",
];

export function WelcomeScreen({ tier, queriesRemaining, onQuerySelect, isAuthenticated, onLogin, onOpenHistory }: WelcomeScreenProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="animate-float mb-8">
        <QuackLogo size="xl" />
      </div>
      
      {/* Tagline */}
      <h1 className="text-2xl md:text-3xl font-display font-bold text-center mb-3">
        <span className="text-gradient">Wallchain & InfoFi</span>
        <br />
        <span className="text-foreground/80">Intelligence Engine</span>
      </h1>
      
      <p className="text-muted-foreground text-center max-w-md mb-8">
        Get verified information about the Wallchain ecosystem. 
        Ask questions, receive facts—no content creation, just reality.
      </p>
      
      {/* User tier */}
      <div className="mb-8">
        <TierBadge tier={tier} showLimits />
      </div>
      
      {/* Features grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mb-10">
        {features.map((feature) => (
          <div 
            key={feature.title}
            className="p-4 rounded-xl bg-card/50 border border-border/50 hover:border-primary/30 transition-colors"
          >
            <feature.icon className="w-6 h-6 text-primary mb-3" />
            <h3 className="font-medium text-foreground mb-1">{feature.title}</h3>
            <p className="text-sm text-muted-foreground">{feature.description}</p>
          </div>
        ))}
      </div>
      
      {/* Example queries - only for authenticated users */}
      {isAuthenticated ? (
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-3">Try asking:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {exampleQueries.map((query) => (
              <button
                key={query}
                onClick={() => onQuerySelect?.(query)}
                className="px-4 py-2 rounded-full bg-secondary/50 border border-border/50 text-sm text-foreground/80 hover:bg-secondary hover:border-primary/30 hover:text-foreground transition-all"
              >
                {query}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">Create a free account</p>
          <button 
            onClick={onLogin}
            className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
          >
            Sign in to Quack check
          </button>
        </div>
      )}
      
      {/* Chat History + Sources reference */}
      <div className="mt-12 flex flex-col items-center gap-3">
        {onOpenHistory && (
          <button
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-secondary/50 border border-border/50 text-sm text-foreground/80 hover:bg-secondary hover:border-primary/30 hover:text-foreground transition-all"
          >
            <History className="w-4 h-4 text-primary" />
            Chat History
          </button>
        )}
        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
          <ExternalLink className="w-3 h-3" />
          Data sourced exclusively from official Wallchain channels
        </p>
      </div>
    </div>
  );
}
