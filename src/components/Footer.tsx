import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-background/50 backdrop-blur-sm">
      <div className="container max-w-4xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © 2026 quackGPT. Powered by Wallchain.
          </p>
          
          <nav className="flex items-center gap-6">
            <Link 
              to="/terms" 
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms
            </Link>
            <Link 
              to="/privacy" 
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy
            </Link>
            <Link 
              to="/ai-disclosure" 
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              AI Disclosure
            </Link>
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
