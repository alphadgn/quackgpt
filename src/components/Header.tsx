import { useState } from "react";
import { QuackLogo } from "./QuackLogo";
import { TierBadge } from "./TierBadge";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { UserTier } from "@/types";
import { Wallet, LogIn, LogOut, Menu, Loader2, Plus, X, Settings, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

interface LinkedWallet {
  address: string;
  chainType: string;
}

interface HeaderProps {
  tier: UserTier;
  isLoggedIn: boolean;
  walletAddress?: string;
  email?: string;
  onLogin?: () => void;
  onLogout?: () => void;
  nftCheckLoading?: boolean;
  linkedWallets?: LinkedWallet[];
  onLinkWallet?: () => void;
  isSuperAdmin?: boolean;
  embeddedWallet?: { address: string } | null;
}

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function Header({ tier, isLoggedIn, walletAddress, email, onLogin, onLogout, nftCheckLoading, linkedWallets = [], onLinkWallet, isSuperAdmin, embeddedWallet }: HeaderProps) {
  const [showNotification, setShowNotification] = useState(false);

  return (
    <>
      {/* Dismissible notification */}
      {showNotification && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/60 backdrop-blur-sm p-4" onClick={() => setShowNotification(false)}>
          <div className="relative max-w-md w-full rounded-xl border border-primary/30 bg-card p-6 shadow-lg glow-primary" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowNotification(false)} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
            <p className="text-sm text-foreground leading-relaxed pr-6">
              We are the deep Quack State anti slop crime fighters. We hope you'll help us to continue our mission of proof of humanity and protecting the integrity of information dissemination from becoming a slop wasteland.
            </p>
          </div>
        </div>
      )}
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
              {nftCheckLoading ? (
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/50 border border-border/50">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">Verifying NFT…</span>
                </div>
              ) : (
                <TierBadge tier={tier} />
              )}
              
              {/* Wallet popover */}
              <Popover>
                <PopoverTrigger asChild>
                  {walletAddress || linkedWallets.length > 0 || embeddedWallet?.address ? (
                    <Button
                      variant="glass"
                      size="sm"
                      className="hidden sm:flex font-mono text-xs"
                    >
                      <Wallet className="w-4 h-4 mr-2" />
                      {walletAddress ? shortenAddress(walletAddress) : embeddedWallet?.address ? shortenAddress(embeddedWallet.address) : `${linkedWallets.length} wallet${linkedWallets.length > 1 ? 's' : ''}`}
                    </Button>
                  ) : (
                    <Button 
                      variant="glass" 
                      size="sm"
                      className="hidden sm:flex"
                    >
                      <Wallet className="w-4 h-4 mr-2" />
                      Connect Wallet
                    </Button>
                  )}
                </PopoverTrigger>
                <PopoverContent className="w-72" align="end">
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-foreground">Connected Wallets</h4>
                    
                    {linkedWallets.length === 0 && !embeddedWallet?.address ? (
                      <p className="text-xs text-muted-foreground">No wallets linked yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {embeddedWallet?.address && !linkedWallets.some(w => w.address.toLowerCase() === embeddedWallet.address.toLowerCase()) && (
                          <div className="flex items-center gap-2 text-xs font-mono bg-secondary/50 px-3 py-2 rounded-lg">
                            <Wallet className="w-3 h-3 text-primary shrink-0" />
                            <span className="truncate">{shortenAddress(embeddedWallet.address)}</span>
                            <span className="text-muted-foreground ml-auto text-[10px]">Privy</span>
                          </div>
                        )}
                        {linkedWallets.map((w, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs font-mono bg-secondary/50 px-3 py-2 rounded-lg">
                            <Wallet className="w-3 h-3 text-primary shrink-0" />
                            <span className="truncate">{shortenAddress(w.address)}</span>
                            <span className="text-muted-foreground ml-auto capitalize text-[10px]">{w.chainType}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {linkedWallets.length < 3 ? (
                      <Button variant="outline" size="sm" className="w-full" onClick={onLinkWallet}>
                        <Plus className="w-3 h-3 mr-2" />
                        Link {linkedWallets.length === 0 ? 'a' : 'Another'} Wallet
                      </Button>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center">Maximum 3 wallets linked</p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              
              {email && (
                <span className="hidden md:block text-xs text-muted-foreground truncate max-w-[140px]">
                  {email}
                </span>
              )}
              
              {isSuperAdmin && (
                <Link to="/admin">
                  <Button variant="ghost" size="icon-sm" title="Admin Dashboard" className="text-primary">
                    <ShieldCheck className="w-4 h-4" />
                  </Button>
                </Link>
              )}

              <Link to="/settings">
                <Button variant="ghost" size="icon-sm" title="Settings">
                  <Settings className="w-4 h-4" />
                </Button>
              </Link>
              
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
          
          {/* Menu button */}
          <Button variant="ghost" size="icon-sm" onClick={() => setShowNotification(true)}>
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
    </>
  );
}
