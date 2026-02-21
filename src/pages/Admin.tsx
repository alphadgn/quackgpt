import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Loader2, RefreshCw, Shield, Zap, Crown, FlaskConical } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { UserTier, TIER_LIMITS } from "@/types";

interface AdminAccount {
  id: string;
  external_user_id: string | null;
  tier: string;
  created_at: string;
  todayUsage: number;
}

const tierIcons: Record<string, typeof Shield> = {
  free: Shield,
  paid: Zap,
  nft_holder: Crown,
};

function shortenId(id: string) {
  if (id.length <= 20) return id;
  return `${id.slice(0, 12)}…${id.slice(-6)}`;
}

export default function Admin() {
  const { authenticated, login, logout, tier, walletAddress, email, nftCheckLoading, linkedWallets, linkWallet, user, isSuperAdmin, embeddedWallet, getAccessToken, tierOverride, setTierOverride } = useAuth();
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const getAuthHeaders = useCallback(async () => {
    const token = await getAccessToken();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      ...(token ? { 'x-privy-token': token } : {}),
    };
  }, [getAccessToken]);

  const fetchAccounts = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-accounts?action=list`,
        { headers }
      );
      const data = await resp.json();
      if (resp.ok && data.accounts) {
        setAccounts(data.accounts);
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
        if (resp.status === 403) {
          toast.error("Access denied: super admin only");
        }
      }
    } catch {
      toast.error("Failed to load accounts");
    } finally {
      setLoading(false);
    }
  }, [user?.id, getAuthHeaders]);

  useEffect(() => {
    if (authenticated && user?.id) fetchAccounts();
  }, [authenticated, user?.id, fetchAccounts]);

  const handleUpdateTier = async (targetUserId: string, newTier: string) => {
    if (!user?.id) return;
    setActionLoading(`tier-${targetUserId}`);
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-accounts?action=update-tier`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ targetUserId, newTier }),
        }
      );
      if (resp.ok) {
        toast.success(`Tier updated to ${newTier}`);
        fetchAccounts();
      } else {
        toast.error("Failed to update tier");
      }
    } catch {
      toast.error("Failed to update tier");
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetUsage = async (targetUserId: string) => {
    if (!user?.id) return;
    setActionLoading(`reset-${targetUserId}`);
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-accounts?action=reset-usage`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ targetUserId }),
        }
      );
      if (resp.ok) {
        toast.success("Usage reset");
        fetchAccounts();
      } else {
        toast.error("Failed to reset usage");
      }
    } catch {
      toast.error("Failed to reset usage");
    } finally {
      setActionLoading(null);
    }
  };

  const handleTierSwitch = (selectedTier: UserTier) => {
    if (tierOverride === selectedTier) {
      // Toggling off — return to real tier
      setTierOverride(null);
      toast.success("Testing mode disabled — using real account tier");
    } else {
      setTierOverride(selectedTier);
      toast.success(`Testing as ${selectedTier === 'nft_holder' ? 'NFT Holder' : selectedTier === 'paid' ? 'Paid' : 'Free'} user`);
    }
  };

  const testingTiers: { key: UserTier; label: string; icon: typeof Shield; description: string }[] = [
    { key: 'free', label: 'Free User', icon: Shield, description: `${TIER_LIMITS.free.maxQueries} query, ${TIER_LIMITS.free.maxCharacters} chars` },
    { key: 'paid', label: 'Paid User', icon: Zap, description: `${TIER_LIMITS.paid.maxQueries} queries, ${TIER_LIMITS.paid.maxCharacters} chars` },
    { key: 'nft_holder', label: 'NFT Holder', icon: Crown, description: `${TIER_LIMITS.nft_holder.maxQueries} queries, ${TIER_LIMITS.nft_holder.maxCharacters} chars` },
  ];

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
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Chat
        </Link>

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-display font-bold text-foreground">Admin Dashboard</h1>
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={fetchAccounts} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          )}
        </div>

        {!authenticated ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">Sign in to access admin panel</p>
            <Button onClick={login} variant="hero">Sign In</Button>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !isAdmin ? (
          <div className="text-center py-12">
            <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Access restricted to super administrators.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Super Admin Profile Testing Section */}
            {isSuperAdmin && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <FlaskConical className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold text-foreground">Profile Testing Mode</h2>
                  {tierOverride && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                      Active: {tierOverride === 'nft_holder' ? 'NFT Holder' : tierOverride === 'paid' ? 'Paid' : 'Free'}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-5">
                  Toggle to simulate different user tiers. Your account will behave as the selected tier across the entire app.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {testingTiers.map(({ key, label, icon: Icon, description }) => {
                    const isActive = tierOverride === key;
                    return (
                      <div
                        key={key}
                        className={`flex items-center justify-between rounded-lg border p-4 transition-all ${
                          isActive
                            ? 'border-primary bg-primary/10 shadow-sm'
                            : 'border-border/50 bg-card/50 hover:border-border'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                          <div>
                            <p className={`text-sm font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {label}
                            </p>
                            <p className="text-xs text-muted-foreground">{description}</p>
                          </div>
                        </div>
                        <Switch
                          checked={isActive}
                          onCheckedChange={() => handleTierSwitch(key)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Accounts Table */}
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{accounts.length} accounts total</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium">User ID</th>
                      <th className="text-center py-3 px-2 text-muted-foreground font-medium">Tier</th>
                      <th className="text-center py-3 px-2 text-muted-foreground font-medium">Today</th>
                      <th className="text-center py-3 px-2 text-muted-foreground font-medium">Joined</th>
                      <th className="text-right py-3 px-2 text-muted-foreground font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((account) => {
                      const Icon = tierIcons[account.tier] || Shield;
                      const limits = TIER_LIMITS[account.tier as UserTier] || TIER_LIMITS.free;
                      return (
                        <tr key={account.id} className="border-b border-border/30 hover:bg-card/50 transition-colors">
                          <td className="py-3 px-2 font-mono text-xs">
                            {account.external_user_id ? shortenId(account.external_user_id) : "—"}
                          </td>
                          <td className="py-3 px-2 text-center">
                            <span className="inline-flex items-center gap-1.5 text-xs">
                              <Icon className="w-3.5 h-3.5 text-primary" />
                              {account.tier}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-center text-xs">
                            {account.todayUsage} / {limits.maxQueries}
                          </td>
                          <td className="py-3 px-2 text-center text-xs text-muted-foreground">
                            {new Date(account.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex items-center justify-end gap-1 flex-wrap">
                              {(["free", "paid", "nft_holder"] as const).filter(t => t !== account.tier).map((t) => (
                                <Button
                                  key={t}
                                  variant="outline"
                                  size="sm"
                                  className="text-xs h-7 px-2"
                                  disabled={actionLoading === `tier-${account.external_user_id}`}
                                  onClick={() => account.external_user_id && handleUpdateTier(account.external_user_id, t)}
                                >
                                  {actionLoading === `tier-${account.external_user_id}` ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    `→ ${t}`
                                  )}
                                </Button>
                              ))}
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-7 px-2"
                                disabled={actionLoading === `reset-${account.external_user_id}`}
                                onClick={() => account.external_user_id && handleResetUsage(account.external_user_id)}
                              >
                                {actionLoading === `reset-${account.external_user_id}` ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  "Reset"
                                )}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
