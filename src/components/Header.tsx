import { QuackLogo } from "./QuackLogo";
import { TierBadge } from "./TierBadge";
import { Button } from "./ui/button";
import { UserTier } from "@/types";
import { Wallet, LogIn, Menu } from "lucide-react";
import { Link } from "react-router-dom";

interface HeaderProps {
  tier: UserTier;
  isLoggedIn: boolean;
  onLogin?: () => void;
  onConnectWallet?: () => void;
}

export function Header({ tier, isLoggedIn, onLogin, onConnectWallet }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center">
          <QuackLogo size="sm" />
        </Link>
        
        {/* Right section */}
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <>
              <TierBadge tier={tier} />
              <Button 
                variant="glass" 
                size="sm"
                onClick={onConnectWallet}
                className="hidden sm:flex"
              >
                <Wallet className="w-4 h-4 mr-2" />
                Connect Wallet
              </Button>
            </>
          ) : (
            <Button 
              variant="hero" 
              size="sm"
              onClick={onLogin}
            >
              <LogIn className="w-4 h-4 mr-2" />
              Sign In
            </Button>
          )}
          
          {/* Mobile menu */}
          <Button variant="ghost" size="icon-sm" className="sm:hidden">
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
