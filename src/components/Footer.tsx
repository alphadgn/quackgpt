import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { useState } from "react";

export function Footer() {
  const navigate = useNavigate();
  const [showAbout, setShowAbout] = useState(false);

  const handleLinkClick = (e: React.MouseEvent, to: string) => {
    e.preventDefault();
    navigate(to);
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  return (
    <>
      {/* About Us dialog */}
      {showAbout && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/60 backdrop-blur-sm p-4" onClick={() => setShowAbout(false)}>
          <div className="relative max-w-md w-full rounded-xl border border-primary/30 bg-card p-6 shadow-lg glow-primary" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowAbout(false)} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-center font-semibold text-foreground mb-3">About Us</h3>
            <p className="text-sm text-foreground leading-relaxed text-center">
              We are the deep Quack State anti slop crime fighters. We hope you'll help us to continue our mission of proof of humanity and protecting the integrity of information dissemination from becoming a slop wasteland.
            </p>
          </div>
        </div>
      )}
    <footer className="border-t border-border/50 bg-background/50 backdrop-blur-sm">
      <div className="container max-w-4xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            All rights reserved QuackGPT 2026
          </p>
          
          <nav className="flex items-center gap-6">
            <a 
              href="/terms"
              onClick={(e) => handleLinkClick(e, "/terms")}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Terms
            </a>
            <a 
              href="/privacy"
              onClick={(e) => handleLinkClick(e, "/privacy")}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Privacy
            </a>
            <a 
              href="/ai-disclosure"
              onClick={(e) => handleLinkClick(e, "/ai-disclosure")}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              AI Disclosure
            </a>
            <a 
              href="https://docs.wallchain.xyz/intro"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Docs
            </a>
            <button
              onClick={() => setShowAbout(true)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              About Us
            </button>
          </nav>
        </div>
      </div>
    </footer>
    </>
  );
}
