import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import { TierBadge } from "@/components/TierBadge";
import { Button } from "@/components/ui/button";
import { TIER_LIMITS, UserTier } from "@/types";
import { Wallet, ArrowLeft, Crown, Zap, Shield, Loader2, CreditCard, ExternalLink } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
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
  const { authenticated, login, logout, tier, walletAddress, email, nftCheckLoading, linkedWallets, linkWallet, user, solanaAddress, embeddedWallet, isSubscribed, isSuperAdmin } = useAuth();
  const [queriesUsedToday, setQueriesUsedToday] = useState(0);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [searchParams] = useSearchParams();

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
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-usage`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            "x-privy-user-id": user.id,
          },
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
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-subscription`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            "x-privy-user-id": user.id,
          },
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
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          "x-privy-user-id": user.id,
        },
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
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/customer-portal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          "x-privy-user-id": user.id,
        },
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

  const limits = TIER_LIMITS[tier];

  return (
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
            <section className="rounded-xl border border-border/50 bg-card/50 p-6">
              <h2 className="text-lg font-display font-semibold text-foreground mb-4">Current Plan</h2>
              <div className="flex items-center gap-3 mb-4">
                <TierBadge tier={tier} showLimits />
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Daily Queries</p>
                  <p className="text-foreground font-medium">{queriesUsedToday} / {limits.maxQueries}</p>
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
            <section className="rounded-xl border border-border/50 bg-card/50 p-6">
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
            <section className="rounded-xl border border-border/50 bg-card/50 p-6">
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
            <section className="rounded-xl border border-border/50 bg-card/50 p-6">
              <h2 className="text-lg font-display font-semibold text-foreground mb-4">Linked Wallets</h2>
              {/* Show embedded wallet if available */}
              {embeddedWallet?.address && linkedWallets.length === 0 && !walletAddress && !solanaAddress && (
                <div className="flex items-center gap-2 text-sm font-mono bg-secondary/50 px-4 py-3 rounded-lg mb-2">
                  <Wallet className="w-4 h-4 text-primary shrink-0" />
                  <span className="truncate">{shortenAddress(embeddedWallet.address)}</span>
                  <span className="text-muted-foreground ml-auto text-xs">Privy Wallet</span>
                </div>
              )}
              {/* Show email as auth method */}
              {email && linkedWallets.length === 0 && !walletAddress && !solanaAddress && !embeddedWallet?.address && (
                <div className="flex items-center gap-2 text-sm bg-secondary/50 px-4 py-3 rounded-lg mb-2">
                  <Shield className="w-4 h-4 text-primary shrink-0" />
                  <span className="truncate">{email}</span>
                  <span className="text-muted-foreground ml-auto text-xs">Email (primary)</span>
                </div>
              )}
              {linkedWallets.length === 0 && !walletAddress && !solanaAddress && !embeddedWallet?.address && (
                <p className="text-sm text-muted-foreground mb-2">No wallets linked yet. Link a wallet to enable NFT verification.</p>
              )}
              {(linkedWallets.length > 0 || walletAddress || solanaAddress) && (
                <div className="space-y-2 mb-4">
                  {linkedWallets.map((w, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm font-mono bg-secondary/50 px-4 py-3 rounded-lg">
                      <Wallet className="w-4 h-4 text-primary shrink-0" />
                      <span className="truncate">{shortenAddress(w.address)}</span>
                      <span className="text-muted-foreground ml-auto capitalize text-xs">
                        {(w as any).walletClientType === 'privy' ? 'Privy Wallet' : w.chainType}
                      </span>
                    </div>
                  ))}
                  {walletAddress && !linkedWallets.some(w => w.address.toLowerCase() === walletAddress.toLowerCase()) && (
                    <div className="flex items-center gap-2 text-sm font-mono bg-secondary/50 px-4 py-3 rounded-lg">
                      <Wallet className="w-4 h-4 text-primary shrink-0" />
                      <span className="truncate">{shortenAddress(walletAddress)}</span>
                      <span className="text-muted-foreground ml-auto text-xs">EVM (connected)</span>
                    </div>
                  )}
                </div>
              )}
              {linkedWallets.length < 3 && (
                <Button variant="outline" size="sm" onClick={linkWallet}>
                  Link {linkedWallets.length === 0 && !walletAddress ? "a" : "Another"} Wallet
                </Button>
              )}
            </section>

            {/* Account Info */}
            <section className="rounded-xl border border-border/50 bg-card/50 p-6">
              <h2 className="text-lg font-display font-semibold text-foreground mb-4">Account</h2>
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
  );
}
