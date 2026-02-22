import { Link, useNavigate } from "react-router-dom";

export function Footer() {
  const navigate = useNavigate();

  const handleLinkClick = (e: React.MouseEvent, to: string) => {
    e.preventDefault();
    navigate(to);
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  return (
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
          </nav>
        </div>
      </div>
    </footer>
  );
}
