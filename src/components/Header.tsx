import { useState } from "react";
import { QuackLogo } from "./QuackLogo";
import { TierBadge } from "./TierBadge";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { UserTier } from "@/types";
import { Wallet, LogIn, LogOut, Home, Loader2, Plus, X, Settings, ShieldCheck, Unlink } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

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
  onUnlinkWallet?: (address: string) => void;
  isSuperAdmin?: boolean;
  embeddedWallet?: { address: string } | null;
}

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function Header({ tier, isLoggedIn, walletAddress, email, onLogin, onLogout, nftCheckLoading, linkedWallets = [], onLinkWallet, onUnlinkWallet, isSuperAdmin, embeddedWallet }: HeaderProps) {
  const [showNotification, setShowNotification] = useState(false);
  const [unlinkTarget, setUnlinkTarget] = useState<string | null>(null);
  const location = useLocation();

  // Build deduplicated list of all wallets to display
  const allWallets = (() => {
    const wallets: { address: string; chainType: string; label?: string }[] = [];
    const seen = new Set<string>();

    // Add embedded wallet first
    if (embeddedWallet?.address) {
      seen.add(embeddedWallet.address.toLowerCase());
      wallets.push({ address: embeddedWallet.address, chainType: 'ethereum', label: 'Privy' });
    }

    // Add linked wallets (dedup against embedded)
    for (const w of linkedWallets) {
      const key = w.address.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        wallets.push({ address: w.address, chainType: w.chainType });
      }
    }

    return wallets;
  })();

  const walletCount = allWallets.length;

  // Count external wallets (non-privy) for the limit: 1 privy + 2 external = 3 max
  const externalWalletCount = allWallets.filter(w => w.label !== 'Privy').length;
  const canLinkMore = externalWalletCount < 2;

  const handleConfirmUnlink = () => {
    if (unlinkTarget && onUnlinkWallet) {
      onUnlinkWallet(unlinkTarget);
    }
    setUnlinkTarget(null);
  };

  return (
    <>
      {/* Unlink confirmation dialog */}
      <AlertDialog open={unlinkTarget !== null} onOpenChange={(open) => !open && setUnlinkTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Wallet</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disconnect wallet{' '}
              <span className="font-mono text-foreground">{unlinkTarget ? shortenAddress(unlinkTarget) : ''}</span>
              ? You can re-link it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmUnlink} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dismissible notification */}
      {showNotification && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/60 backdrop-blur-sm p-4" onClick={() => setShowNotification(false)}>
          <div className="relative max-w-md w-full rounded-xl border border-primary/30 bg-card p-6 shadow-lg glow-primary" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowNotification(false)} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-center font-semibold text-foreground mb-3">About Us</h3>
            <p className="text-sm text-foreground leading-relaxed text-center">
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
                  {walletAddress || walletCount > 0 ? (
                    <Button
                      variant="glass"
                      size="sm"
                      className="hidden sm:flex font-mono text-xs"
                    >
                      <Wallet className="w-4 h-4 mr-2" />
                      {walletAddress ? shortenAddress(walletAddress) : `${walletCount} wallet${walletCount > 1 ? 's' : ''}`}
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
                    <p className="text-[10px] text-muted-foreground">1 Privy wallet + up to 2 external wallets</p>
                    
                    {walletCount === 0 ? (
                      <p className="text-xs text-muted-foreground">No wallets linked yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {allWallets.map((w, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs font-mono bg-secondary/50 px-3 py-2 rounded-lg">
                            <Wallet className="w-3 h-3 text-primary shrink-0" />
                            <span className="truncate">{shortenAddress(w.address)}</span>
                            <span className="text-muted-foreground ml-auto capitalize text-[10px]">{w.label || w.chainType}</span>
                            {onUnlinkWallet && w.label !== 'Privy' && (
                              <button
                                onClick={() => setUnlinkTarget(w.address)}
                                className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                                title="Disconnect wallet"
                              >
                                <Unlink className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {canLinkMore ? (
                      <Button variant="outline" size="sm" className="w-full" onClick={onLinkWallet}>
                        <Plus className="w-3 h-3 mr-2" />
                        Link {walletCount === 0 ? 'a' : 'Another'} Wallet
                      </Button>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center">Maximum wallets linked (1 Privy + 2 external)</p>
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
                <Link to="/admin" tabIndex={-1} className="outline-none">
                  <button type="button" title="Admin Dashboard" tabIndex={-1} className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground transition-colors outline-none border-none bg-transparent appearance-none cursor-pointer">
                    <ShieldCheck className="w-4 h-4" />
                  </button>
                </Link>
              )}

              <Link to="/settings" tabIndex={-1} className="outline-none">
                <button type="button" title="Settings" tabIndex={-1} className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground transition-colors outline-none border-none bg-transparent appearance-none cursor-pointer">
                  <Settings className="w-4 h-4" />
                </button>
              </Link>
              
            </>
          ) : (
            <Button 
              variant="hero" 
              size="sm"
              onClick={onLogin}
            >
              <LogIn className="w-4 h-4 mr-2" />
              Sign In/Up
            </Button>
          )}
          
          {/* Home button - only for logged-in users on non-home pages */}
          {isLoggedIn && location.pathname !== "/" && (
            <Link to="/" tabIndex={-1} className="outline-none">
              <button type="button" title="Home" tabIndex={-1} className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground transition-colors outline-none border-none bg-transparent appearance-none cursor-pointer">
                <Home className="w-5 h-5" />
              </button>
            </Link>
          )}

          {/* Logout - right of menu */}
          {isLoggedIn && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onLogout}
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </header>
    </>
  );
}
