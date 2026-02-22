import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import { TierBadge } from "@/components/TierBadge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { TIER_LIMITS, UserTier } from "@/types";
import { Wallet, ArrowLeft, Crown, Zap, Shield, Loader2, CreditCard, ExternalLink, Unlink } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";

const tierInfo: Record<UserTier, { label: string; icon: typeof Crown; price: string }> = {
  free: { label: "Free", icon: Shield, price: "$0" },
  paid: { label: "Paid", icon: Zap, price: "$1.49/week" },
  nft_holder: { label: "Quack Heads NFT", icon: Crown, price: "NFT Required" },
};

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export default function Settings() {
  const { authenticated, login, logout, tier, walletAddress, email, nftCheckLoading, linkedWallets, linkWallet, unlinkWallet, unlinkAllWeb3Wallets, user, solanaAddress, embeddedWallet, isSubscribed, isSuperAdmin, getAccessToken } = useAuth();
  const [queriesUsedToday, setQueriesUsedToday] = useState(0);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const [showResetWalletsDialog, setShowResetWalletsDialog] = useState(false);
  const [resetWalletsLoading, setResetWalletsLoading] = useState(false);

  const getAuthHeaders = useCallback(async () => {
    const token = await getAccessToken();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      ...(token ? { 'x-privy-token': token } : {}),
    };
  }, [getAccessToken]);
  // Check for checkout success
  useEffect(() => {
    if (searchParams.get("checkout") === "success") {
      toast.success("Subscription activated! Welcome to quackGPT Paid.");
    }
  }, [searchParams]);

  // Fetch daily usage from server (respects 24h rolling cycle)
  useEffect(() => {
    if (!user?.id || !authenticated) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getAccessToken();
        if (!token) return;
        const headers = await getAuthHeaders();
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-usage`, {
          headers,
        });
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled) setQueriesUsedToday(data.queriesUsed ?? 0);
        }
      } catch (err) {
        console.error("Failed to fetch usage:", err);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, authenticated]);

  // Fetch subscription end date for display
  useEffect(() => {
    if (!user?.id || !authenticated) return;
    (async () => {
      try {
        const headers = await getAuthHeaders();
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-subscription`, {
          method: "POST",
          headers,
        });
        const data = await resp.json();
        setSubscriptionEnd(data.subscription_end || null);
      } catch (err) {
        console.error("Failed to check subscription:", err);
      }
    })();
  }, [user?.id, authenticated, searchParams]);

  const handleCheckout = async () => {
    if (!user?.id) return;
    setCheckoutLoading(true);
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`, {
        method: "POST",
        headers,
      });
      const data = await resp.json();
      if (data.url) {
        const w = window.open(data.url, '_blank');
        if (!w) {
          // Fallback if popup blocked
          window.location.href = data.url;
        }
      } else {
        toast.error(data.error || "Failed to create checkout session");
      }
    } catch (err) {
      toast.error("Failed to start checkout");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!user?.id) return;
    setPortalLoading(true);
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/customer-portal`, {
        method: "POST",
        headers,
      });
      const data = await resp.json();
      if (data.url) {
        window.open(data.url, "_blank");
      } else {
        toast.error(data.error || "Failed to open subscription portal");
      }
    } catch (err) {
      toast.error("Failed to open portal");
    } finally {
      setPortalLoading(false);
    }
  };

  const handleResetWeb3Wallets = async () => {
    setResetWalletsLoading(true);
    try {
      await unlinkAllWeb3Wallets?.();
      toast.success("All external Web3 wallets have been unlinked. You can now connect new ones.");
    } catch (err) {
      toast.error("Failed to unlink some wallets. Please try again.");
    } finally {
      setResetWalletsLoading(false);
      setShowResetWalletsDialog(false);
    }
  };

  const limits = TIER_LIMITS[tier];

  // Build the wallet display list — only show actual wallet-type accounts
  const walletOnlyList = linkedWallets.filter(w => w.chainType === 'ethereum' || w.chainType === 'solana');
  const privyWallet = walletOnlyList.find(w => w.walletClientType === 'privy');
  const externalWallets = walletOnlyList.filter(w => w.walletClientType !== 'privy');
  const externalWalletCount = externalWallets.length;

  return (
    <>
    <AlertDialog open={showResetWalletsDialog} onOpenChange={setShowResetWalletsDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset Web3 Wallets</AlertDialogTitle>
          <AlertDialogDescription>
            This will disconnect all external Web3 wallets ({externalWalletCount}) from your account. Your Privy embedded wallet will be preserved. You can reconnect wallets afterwards.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleResetWeb3Wallets}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={resetWalletsLoading}
          >
            {resetWalletsLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Disconnect All Web3 Wallets
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <div className="min-h-screen flex flex-col relative z-10">
      <Header
        tier={tier}
        isLoggedIn={authenticated}
        walletAddress={walletAddress}
        email={email}
        onLogin={login}
        onLogout={logout}
        nftCheckLoading={nftCheckLoading}
        linkedWallets={linkedWallets}
        onLinkWallet={linkWallet}
        isSuperAdmin={isSuperAdmin}
        embeddedWallet={embeddedWallet}
      />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Chat
        </Link>

        <h1 className="text-2xl font-display font-bold text-foreground mb-8">Account Settings</h1>

        {!authenticated ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">Sign in to view your settings</p>
            <Button onClick={login} variant="hero">Sign In</Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current Tier */}
            <section className="border-y border-border/50 bg-card/50 p-6">
              <h2 className="text-lg font-display font-semibold text-foreground mb-4">Current Plan</h2>
              <div className="flex items-center gap-3 mb-4">
                <TierBadge tier={tier} showLimits />
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Daily Queries</p>
                  <p className="text-foreground font-medium">{Math.min(queriesUsedToday, limits.maxQueries)} / {limits.maxQueries}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Max Response Length</p>
                  <p className="text-foreground font-medium">{limits.maxCharacters} chars</p>
                </div>
              </div>
              {isSubscribed && subscriptionEnd && (
                <p className="text-xs text-muted-foreground mt-3">
                  Subscription renews: {new Date(subscriptionEnd).toLocaleDateString()}
                </p>
              )}
            </section>

            {/* Subscription Actions */}
            <section className="border-y border-border/50 bg-card/50 p-6">
              <h2 className="text-lg font-display font-semibold text-foreground mb-4">Subscription</h2>
              {tier === "free" ? (
                <div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Upgrade to the Paid plan for 3 daily queries with 300-character responses at $1.49/week.
                  </p>
                  <Button onClick={handleCheckout} disabled={checkoutLoading} variant="hero">
                    {checkoutLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
                    Subscribe — $1.49/week
                  </Button>
                </div>
              ) : isSubscribed ? (
                <div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Manage your subscription, update payment method, or cancel.
                  </p>
                  <Button onClick={handleManageSubscription} disabled={portalLoading} variant="outline">
                    {portalLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ExternalLink className="w-4 h-4 mr-2" />}
                    Manage Subscription
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {tier === "nft_holder" ? "You have NFT holder access — no subscription needed." : "You have an active plan."}
                </p>
              )}
            </section>

            {/* Tier Comparison Table */}
            <section className="border-y border-border/50 bg-card/50 p-6">
              <h2 className="text-lg font-display font-semibold text-foreground mb-4">Plans & Pricing</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-3 text-muted-foreground font-medium">Plan</th>
                      <th className="text-center py-3 text-muted-foreground font-medium">Price</th>
                      <th className="text-center py-3 text-muted-foreground font-medium">Queries/Day</th>
                      <th className="text-center py-3 text-muted-foreground font-medium">Response Limit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(["free", "paid", "nft_holder"] as UserTier[]).map((t) => {
                      const info = tierInfo[t];
                      const tLimits = TIER_LIMITS[t];
                      const isCurrent = t === tier;
                      return (
                        <tr key={t} className={`border-b border-border/30 ${isCurrent ? "bg-primary/5" : ""}`}>
                          <td className="py-3 flex items-center gap-2">
                            <info.icon className={`w-4 h-4 ${isCurrent ? "text-primary" : "text-muted-foreground"}`} />
                            <span className={isCurrent ? "text-primary font-semibold" : "text-foreground"}>
                              {info.label} {isCurrent && "(Current)"}
                            </span>
                          </td>
                          <td className="py-3 text-center text-foreground">{info.price}</td>
                          <td className="py-3 text-center text-foreground">{tLimits.maxQueries}</td>
                          <td className="py-3 text-center text-foreground">{tLimits.maxCharacters} chars</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Linked Wallets */}
            <section className="border-y border-border/50 bg-card/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-display font-semibold text-foreground">Linked Wallets</h2>
                <span className="text-xs text-muted-foreground">1 Privy + up to 2 external</span>
              </div>

              {linkedWallets.length === 0 && (
                <p className="text-sm text-muted-foreground mb-4">No wallets linked yet. Link a wallet to enable NFT verification.</p>
              )}

              {linkedWallets.length > 0 && (
                <div className="space-y-2 mb-4">
                  {/* Privy embedded wallet */}
                  {privyWallet && (
                    <div className="flex items-center gap-2 text-sm font-mono bg-secondary/50 px-4 py-3 rounded-lg border border-primary/20">
                      <Wallet className="w-4 h-4 text-primary shrink-0" />
                      <span className="truncate">{shortenAddress(privyWallet.address)}</span>
                      <span className="text-muted-foreground ml-auto text-xs">Privy (embedded)</span>
                    </div>
                  )}
                  {/* External wallets */}
                  {externalWallets.map((w, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm font-mono bg-secondary/50 px-4 py-3 rounded-lg">
                      <Wallet className="w-4 h-4 text-primary shrink-0" />
                      <span className="truncate">{shortenAddress(w.address)}</span>
                      <span className="text-muted-foreground ml-auto capitalize text-xs">{w.chainType}</span>
                      {unlinkWallet && (
                        <button
                          onClick={() => unlinkWallet(w.address)}
                          className="text-muted-foreground hover:text-destructive transition-colors shrink-0 ml-1"
                          title="Disconnect wallet"
                        >
                          <Unlink className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {externalWalletCount < 2 && (
                  <Button variant="outline" size="sm" onClick={linkWallet}>
                    <Wallet className="w-3.5 h-3.5 mr-2" />
                    Link {linkedWallets.length === 0 ? "a" : "Another"} Wallet
                  </Button>
                )}
                {/* Always show Reset — even if ghost wallets exist but aren't displayed */}
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => setShowResetWalletsDialog(true)}
                >
                  <Unlink className="w-3.5 h-3.5 mr-2" />
                  Reset All Web3 Wallets
                </Button>
              </div>
            </section>

            {/* Account Info */}
            <section className="border-y border-border/50 bg-card/50 p-6">
              <h2 className="text-lg font-display font-semibold text-foreground mb-4">Connected Account</h2>
              {email && (
                <div className="text-sm">
                  <p className="text-muted-foreground">Email</p>
                  <p className="text-foreground">{email}</p>
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
    </>
  );
}
