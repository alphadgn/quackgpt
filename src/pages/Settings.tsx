import { ScrollBendContainer } from "@/components/ScrollBendContainer";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import { TierBadge } from "@/components/TierBadge";
import { UserProfileCard } from "@/components/UserProfileCard";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { TIER_LIMITS, UserTier } from "@/types";
import { Wallet, ArrowLeft, Crown, Zap, Shield, Loader2, CreditCard, ExternalLink, Unlink, History, Bird, ChevronRight, MessageSquare, ThumbsUp, ThumbsDown } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";

const tierInfo: Record<UserTier, { label: string; icon: typeof Crown; price: string }> = {
  free: { label: "Free", icon: Shield, price: "$0" },
  paid: { label: "Paid", icon: Zap, price: "$1.49/week (trial offer)" },
  nft_holder: { label: "Ugly Duck Society NFT", icon: Crown, price: "NFT Required" },
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

  // History state
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, { type: string }>>({});

  // Tweet audit history state
  const [audits, setAudits] = useState<any[]>([]);
  const [auditsLoading, setAuditsLoading] = useState(false);
  const [expandedAudit, setExpandedAudit] = useState<string | null>(null);

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

  // Fetch query history and tweet audit history
  useEffect(() => {
    if (!user?.id || !authenticated) return;
    let cancelled = false;
    (async () => {
      try {
        const headers = await getAuthHeaders();
        const [sessResp, fbResp, auditResp] = await Promise.all([
          fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-history?action=list-sessions`, { headers }),
          fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-history?action=list-feedback`, { headers }),
          fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-history?action=list-audits`, { headers }),
        ]);
        if (!cancelled) {
          const sessData = await sessResp.json();
          if (sessData.sessions) setSessions(sessData.sessions);

          const fbData = await fbResp.json().catch(() => ({ feedback: [] }));
          if (fbData.feedback) {
            const map: Record<string, { type: string }> = {};
            for (const fb of fbData.feedback) {
              const key = fb.message_content?.substring(0, 100) || "";
              if (key) map[key] = { type: fb.feedback_type };
            }
            setFeedbackMap(map);
          }

          const auditData = await auditResp.json();
          if (auditData.audits) setAudits(auditData.audits);
        }
      } catch (err) {
        console.error("Failed to fetch history:", err);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, authenticated]);

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
    <div className="min-h-screen flex flex-col relative z-10 overflow-x-hidden">
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

        <h1 className="text-2xl font-display font-bold text-foreground mb-8 text-center">Account Settings</h1>

        {!authenticated ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">Sign in to view your settings</p>
            <Button onClick={login} variant="hero">Sign In</Button>
          </div>
        ) : (
          <ScrollBendContainer className="space-y-6">
            {/* User Profile */}
            <section className="border-y border-border/50 bg-card/50 p-6">
              <h2 className="text-lg font-display font-semibold text-foreground mb-4 text-center">My Profile</h2>
              <UserProfileCard getAuthHeaders={getAuthHeaders} />
            </section>

            {/* Current Tier */}
            <section className="border-y border-border/50 bg-card/50 p-6">
              <h2 className="text-lg font-display font-semibold text-foreground mb-4 text-center">Current Plan</h2>
              <div className="flex items-center justify-center gap-3 mb-4">
                <TierBadge tier={tier} showLimits />
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm text-center">
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
              <h2 className="text-lg font-display font-semibold text-foreground mb-4 text-center">Subscription</h2>
              {tier === "free" ? (
                <div>
                  <p className="text-sm text-muted-foreground mb-4 text-center">
                    Upgrade to the Paid plan for 3 daily queries with 300-character responses at $1.49/week (trial offer).
                  </p>
                  <div className="flex flex-col items-center gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button onClick={handleCheckout} disabled={checkoutLoading} variant="hero">
                          {checkoutLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
                          Subscribe — $1.49/week (trial offer)
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[260px] text-center">
                        <p className="text-xs">This is a limited-time trial offer. Prices are subject to change after the trial period ends.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
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

            {/* Floating finger pointing down */}
            <div className="flex justify-center py-2">
              <span className="text-2xl animate-point-down">👇</span>
            </div>

            {/* Tier Comparison Table */}
            <section className="border-y border-border/50 bg-card/50 p-6">
              <h2 className="text-lg font-display font-semibold text-foreground mb-4 text-center">Plans & Pricing</h2>
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
              <div className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-2">
                <h2 className="text-lg font-display font-semibold text-foreground text-center flex-1">Linked Wallets</h2>
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

              <div className="flex flex-wrap gap-2 justify-center">
                {externalWalletCount < 2 && (
                  <Button variant="outline" size="sm" onClick={linkWallet}>
                    <Wallet className="w-3.5 h-3.5 mr-2" />
                    Link {linkedWallets.length === 0 ? "a" : "Another"} Wallet
                  </Button>
                )}
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

            {/* Query History */}
            <section className="border-y border-border/50 bg-card/50 p-6">
              <div className="flex items-center gap-2 mb-4 justify-center">
                <History className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-display font-semibold text-foreground">Query History</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground ml-2">
                  {sessions.length} sessions
                </span>
              </div>

              {sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No query history yet. Start a search, quack check, or tweet audit!</p>
              ) : (
                <div className="max-h-[400px] overflow-y-auto rounded-lg border border-border/30 p-2 space-y-2">
                  {sessions.map((session: any) => {
                    const isExpanded = expandedSession === session.session_id;
                    const pairs: { user: any; assistant: any | null }[] = [];
                    for (let i = 0; i < session.messages.length; i++) {
                      if (session.messages[i].role === "user") {
                        const next = session.messages[i + 1];
                        pairs.push({
                          user: session.messages[i],
                          assistant: next?.role === "assistant" ? next : null,
                        });
                        if (next?.role === "assistant") i++;
                      }
                    }
                    return (
                      <div key={session.session_id} className="rounded-lg border border-border/50 overflow-hidden" style={(() => {
                        const p = (session.preview || '').toUpperCase();
                        if (p.includes('[WALLCHAIN]')) return { backgroundColor: 'rgba(234, 179, 8, 0.15)', borderLeft: '4px solid rgb(234, 179, 8)' };
                        if (p.includes('[IDOS') || p.includes('[IDOS NETWORK]')) return { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderLeft: '4px solid rgb(16, 185, 129)' };
                        if (p.includes('[BEYOND]')) return { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderLeft: '4px solid rgb(239, 68, 68)' };
                        if (p.includes('WALLCHAIN') || p.includes('WALL CHAIN') || p.includes('INFOFI') || p.includes('QUACK')) return { backgroundColor: 'rgba(234, 179, 8, 0.15)', borderLeft: '4px solid rgb(234, 179, 8)' };
                        if (p.includes('IDOS')) return { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderLeft: '4px solid rgb(16, 185, 129)' };
                        if (p.includes('BEYOND')) return { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderLeft: '4px solid rgb(239, 68, 68)' };
                        return { backgroundColor: 'rgba(234, 179, 8, 0.15)', borderLeft: '4px solid rgb(234, 179, 8)' };
                      })()}>
                        <button
                          className="w-full flex items-center gap-2 p-3 text-left hover:bg-muted/30 transition-colors"
                          onClick={() => setExpandedSession(isExpanded ? null : session.session_id)}
                        >
                          <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-foreground truncate">{session.preview || "Chat session"}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(session.created_at).toLocaleDateString()} • {pairs.length} {pairs.length === 1 ? "exchange" : "exchanges"}
                            </p>
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="border-t border-border/30 bg-muted/10 max-h-60 overflow-y-auto p-3 space-y-2">
                            {pairs.map((pair, i) => {
                              const fb = pair.assistant ? feedbackMap[pair.assistant.content?.substring(0, 100) || ""] : null;
                              return (
                                <div key={i} className="rounded-md border border-border/30 p-3 space-y-1" style={(() => {
                                  const c = (pair.user.content || '').toUpperCase();
                                  if (c.includes('[WALLCHAIN]')) return { backgroundColor: 'rgba(234, 179, 8, 0.25)', borderLeft: '4px solid rgb(234, 179, 8)' };
                                  if (c.includes('[IDOS') || c.includes('[IDOS NETWORK]')) return { backgroundColor: 'rgba(16, 185, 129, 0.25)', borderLeft: '4px solid rgb(16, 185, 129)' };
                                  if (c.includes('[BEYOND]')) return { backgroundColor: 'rgba(239, 68, 68, 0.25)', borderLeft: '4px solid rgb(239, 68, 68)' };
                                  if (c.includes('WALLCHAIN') || c.includes('WALL CHAIN') || c.includes('INFOFI') || c.includes('QUACK')) return { backgroundColor: 'rgba(234, 179, 8, 0.25)', borderLeft: '4px solid rgb(234, 179, 8)' };
                                  if (c.includes('IDOS')) return { backgroundColor: 'rgba(16, 185, 129, 0.25)', borderLeft: '4px solid rgb(16, 185, 129)' };
                                  if (c.includes('BEYOND')) return { backgroundColor: 'rgba(239, 68, 68, 0.25)', borderLeft: '4px solid rgb(239, 68, 68)' };
                                  return { backgroundColor: 'rgba(234, 179, 8, 0.25)', borderLeft: '4px solid rgb(234, 179, 8)' };
                                })()}>
                                  <div className="text-xs">
                                    <span className="font-semibold text-primary">You:</span>{" "}
                                    <span className="text-foreground/90">{pair.user.content}</span>
                                  </div>
                                  {pair.assistant && (
                                    <div className="text-xs">
                                      <span className="font-semibold text-muted-foreground">quackGPT:</span>{" "}
                                      <span className="text-foreground/70">{pair.assistant.content}</span>
                                    </div>
                                  )}
                                  {fb && (
                                    <div className="flex items-center gap-1 pt-1 border-t border-border/20">
                                      {fb.type === "positive" ? <ThumbsUp className="w-3 h-3 text-primary" /> : <ThumbsDown className="w-3 h-3 text-destructive" />}
                                      <span className="text-[10px] text-muted-foreground">{fb.type === "positive" ? "Liked" : "Disliked"}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Tweet Audit History */}
            <section className="border-y border-border/50 bg-card/50 p-6">
              <div className="flex items-center gap-2 mb-4 justify-center">
                <Bird className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-display font-semibold text-foreground">Tweet Audit History</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground ml-2">
                  {audits.length} audits
                </span>
              </div>

              {audits.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No tweet audits yet. Try the Tweet Audit mode!</p>
              ) : (
                <div className="max-h-[400px] overflow-y-auto rounded-lg border border-border/30 p-2 space-y-2">
                  {audits.map((audit: any) => {
                    const isExpanded = expandedAudit === audit.id;
                    const scoreColor = audit.composite_score >= 75 ? "text-primary" : audit.composite_score >= 50 ? "text-amber-500" : "text-destructive";
                    return (
                      <div key={audit.id} className="rounded-lg border border-border/50 bg-card/50 overflow-hidden">
                        <button
                          className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/30 transition-colors"
                          onClick={() => setExpandedAudit(isExpanded ? null : audit.id)}
                        >
                          <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-foreground truncate">"{audit.tweet_text}"</p>
                            <p className="text-[10px] text-muted-foreground">{new Date(audit.created_at).toLocaleString()}</p>
                          </div>
                          <span className={`text-sm font-bold font-mono ${scoreColor}`}>{audit.composite_score}</span>
                        </button>
                        {isExpanded && (
                          <div className="border-t border-border/30 bg-muted/10 p-3 space-y-2">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div><span className="text-muted-foreground">Relevancy:</span> <span className="font-mono font-semibold">{audit.relevancy_score}</span></div>
                              <div><span className="text-muted-foreground">Correctness:</span> <span className="font-mono font-semibold">{audit.correctness_score}</span></div>
                              <div><span className="text-muted-foreground">Honesty:</span> <span className="font-mono font-semibold">{audit.honesty_score}</span></div>
                              <div><span className="text-muted-foreground">Brand Alignment:</span> <span className="font-mono font-semibold">{audit.brand_alignment_score}</span></div>
                            </div>
                            {audit.risk_flags?.length > 0 && (
                              <div className="text-xs text-destructive">
                                <p className="font-semibold mb-1">⚠️ Risk Flags:</p>
                                {audit.risk_flags.map((f: string, i: number) => <p key={i}>• {f}</p>)}
                              </div>
                            )}
                            {audit.suggested_improvements?.length > 0 && (
                              <div className="text-xs text-primary">
                                <p className="font-semibold mb-1">💡 Improvements:</p>
                                {audit.suggested_improvements.map((s: string, i: number) => <p key={i}>• {s}</p>)}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Connected Account - at bottom */}
            <section className="border-y border-border/50 bg-card/50 p-6">
              <h2 className="text-lg font-display font-semibold text-foreground mb-4 text-center">Connected Account</h2>
              {email && (
                <div className="text-sm text-center">
                  <p className="text-muted-foreground">Email</p>
                  <p className="text-foreground">{email}</p>
                </div>
              )}
            </section>
          </ScrollBendContainer>
        )}
      </main>
    </div>
    </>
  );
}
