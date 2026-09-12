import { ScrollBendContainer } from "./ScrollBendContainer";
import { QuackLogo } from "./QuackLogo";
import { Database, Shield, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WelcomeScreenProps {
  onQuerySelect?: (query: string) => void;
}

const features = [
  {
    icon: Database,
    title: "🔎 Search",
    description: "Information about Ugly Duck Society, drawn only from its official sources.",
  },
  {
    icon: Shield,
    title: "🦆 Quack Check",
    description: "Check a claim against published evidence: true, false, partly true, unverified or outdated.",
  },
  {
    icon: Rocket,
    title: "🚀 UDS Launchpad",
    description: "Visit UDS Labs for tools, mints, and ecosystem entry points.",
  },
];

const exampleQueries = [
  "What is Ugly Duck Society?",
  "What is the community's mission?",
  "What has been announced recently?",
  "Tell me about the NFT collection",
];

export function WelcomeScreen({ onQuerySelect }: WelcomeScreenProps) {
  return (
    <ScrollBendContainer className="flex-1 flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="animate-float mb-8">
        <QuackLogo size="xl" />
      </div>
      
      {/* Tagline */}
      <h1 className="text-2xl md:text-3xl font-display font-bold text-center mb-3">
        <span className="text-gradient">Ugly Duck Society</span>
        <br />
        <span className="text-foreground/80">Information Assistant</span>
      </h1>
      
      <p className="text-muted-foreground text-center max-w-md mb-8">
        Ask anything about Ugly Duck Society — an NFT collection and community that exists to do good in the world.
        Every answer comes from its official sources, with a link and a date. Nothing invented.
      </p>
      
      {/* Features grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mb-10">
        {features.map((feature) => (
          <div 
            key={feature.title}
            className="p-4 rounded-xl bg-card/50 border border-border/50 hover:border-primary/30 transition-colors"
          >
            <feature.icon className="w-6 h-6 text-primary mb-3" />
            <h3 className="font-medium text-foreground mb-1 text-center">{feature.title}</h3>
            <p className="text-sm text-muted-foreground">{feature.description}</p>
          </div>
        ))}
      </div>
      
      <div className="text-center">
          <p className="text-sm text-muted-foreground mb-3">Try asking:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {exampleQueries.map((query) => (
              <Button
                key={query}
                variant="glass"
                onClick={() => onQuerySelect?.(query)}
                className="rounded-full"
              >
                {query}
              </Button>
            ))}
          </div>
      </div>
      
    </ScrollBendContainer>
  );
}
