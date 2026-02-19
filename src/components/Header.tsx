import { QuackLogo } from "./QuackLogo";
import { TierBadge } from "./TierBadge";
import { Button } from "./ui/button";
import { UserTier } from "@/types";
import { Wallet, LogIn, LogOut, Menu } from "lucide-react";
import { Link } from "react-router-dom";
import { useWeb3Modal } from '@web3modal/wagmi/react';

interface HeaderProps {
  tier: UserTier;
  isLoggedIn: boolean;
  walletAddress?: string;
  email?: string;
  onLogin?: () => void;
  onLogout?: () => void;
}

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function Header({ tier, isLoggedIn, walletAddress, email, onLogin, onLogout }: HeaderProps) {
  let openModal: (() => void) | undefined;
  try {
    const modal = useWeb3Modal();
    openModal = modal.open;
  } catch {
    // Web3Modal not available
  }

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
              
              {walletAddress ? (
                <Button
                  variant="glass"
                  size="sm"
                  onClick={() => openModal?.()}
                  className="hidden sm:flex font-mono text-xs"
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  {shortenAddress(walletAddress)}
                </Button>
              ) : (
                <Button 
                  variant="glass" 
                  size="sm"
                  onClick={() => openModal?.()}
                  className="hidden sm:flex"
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  Connect Wallet
                </Button>
              )}
              
              {email && (
                <span className="hidden md:block text-xs text-muted-foreground truncate max-w-[140px]">
                  {email}
                </span>
              )}
              
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onLogout}
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
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
