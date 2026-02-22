import { Link } from "react-router-dom";
import { QuackLogo } from "@/components/QuackLogo";
import { ArrowLeft, AlertTriangle, Shield, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WHITELISTED_SOURCES } from "@/types";
import { ScrollBendContainer } from "@/components/ScrollBendContainer";

const AIDisclosure = () => {
  return (
    <div className="min-h-screen relative z-10">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center">
            <QuackLogo size="sm" />
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Chat
            </Link>
          </Button>
        </div>
      </header>
      
      <main className="container max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-display font-bold text-gradient mb-8">AI Disclosure</h1>
        
        {/* Key warning box */}
        <div className="p-6 rounded-xl bg-primary/10 border border-primary/30 mb-8">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-primary shrink-0 mt-0.5" />
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-2">Important Notice</h2>
              <p className="text-foreground/80">
                quackGPT is an AI-powered information system. While we strive for accuracy, AI responses may contain errors. Always verify critical information from primary sources.
              </p>
            </div>
          </div>
        </div>
        
        <ScrollBendContainer className="space-y-8">
          {/* How it works */}
          <section className="p-6 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">How quackGPT Works</h2>
            </div>
            <ul className="space-y-3 text-foreground/80">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                quackGPT is trained to provide information ONLY from verified Wallchain sources
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                It does NOT create original content, narratives, or marketing materials
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Responses are limited by character count based on your user tier
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Content creation requests are automatically blocked
              </li>
            </ul>
          </section>
          
          {/* Verified sources */}
          <section className="p-6 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Database className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Verified Data Sources</h2>
            </div>
            <p className="text-foreground/80 mb-4">
              quackGPT only references information from these official sources:
            </p>
            <ul className="flex flex-col items-center gap-2 w-full">
              {WHITELISTED_SOURCES.map((source) => (
                <li 
                  key={source}
                  className="px-3 py-2 rounded-lg bg-secondary/50 text-sm text-foreground/80 font-mono w-full max-w-md text-center"
                >
                  {source}
                </li>
              ))}
            </ul>
          </section>
          
          {/* Disclaimers */}
          <section className="p-6 rounded-xl bg-card border border-border">
            <h2 className="text-xl font-semibold text-foreground mb-4">Disclaimers</h2>
            <div className="space-y-4 text-foreground/80">
              <p>
                <strong className="text-foreground">Not Financial Advice:</strong> Information provided by quackGPT is for informational purposes only and should not be construed as financial, investment, legal, or professional advice.
              </p>
              <p>
                <strong className="text-foreground">No Guarantees:</strong> While we source information from official channels, we cannot guarantee 100% accuracy or timeliness of all information.
              </p>
              <p>
                <strong className="text-foreground">NFT Ownership:</strong> Holding Quack Heads NFTs grants access privileges to quackGPT but does not constitute ownership of equity, profit rights, or any other financial interest in Wallchain or related entities.
              </p>
              <p>
                <strong className="text-foreground">Third-Party Links:</strong> References to external sources are provided for verification purposes. We are not responsible for content on third-party websites.
              </p>
            </div>
          </section>
        </ScrollBendContainer>
      </main>
    </div>
  );
};

export default AIDisclosure;
