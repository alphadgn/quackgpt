import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Loader2, RefreshCw, Shield, Zap, Crown, FlaskConical, Globe, Plus, Trash2, ThumbsDown, ThumbsUp, Check, X, MessageSquare, History, ChevronRight, User } from "lucide-react";
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

interface ScrapeSource {
  id: string;
  url: string;
  label: string;
  is_active: boolean;
  created_at: string;
}

interface FeedbackItem {
  id: string;
  external_user_id: string;
  message_content: string;
  user_query: string | null;
  feedback_type: string;
  admin_reviewed: boolean;
  admin_override: string | null;
  created_at: string;
}

interface HistorySession {
  session_id: string;
  created_at: string;
  preview: string;
  messages: { role: string; content: string; created_at: string }[];
  user_deleted: boolean;
}

interface FeedbackEntry {
  message_content: string;
  feedback_type: string;
  user_query: string | null;
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

  // Sources state
  const [sources, setSources] = useState<ScrapeSource[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [newSourceLabel, setNewSourceLabel] = useState("");
  const [addingSource, setAddingSource] = useState(false);

  // Feedback state
  const [negativeFeedback, setNegativeFeedback] = useState<FeedbackItem[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [overrideText, setOverrideText] = useState<Record<string, string>>({});

  // Chat history state
  const [historyUsers, setHistoryUsers] = useState<string[]>([]);
  const [historySessions, setHistorySessions] = useState<HistorySession[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistoryUser, setSelectedHistoryUser] = useState<string | null>(null);
  const [expandedHistorySession, setExpandedHistorySession] = useState<string | null>(null);
  const [deletingHistorySession, setDeletingHistorySession] = useState<string | null>(null);
  const [historyFeedbackMap, setHistoryFeedbackMap] = useState<Record<string, { type: string; reviewed: boolean; hasOverride: boolean }>>({});
  const getAuthHeaders = useCallback(async () => {
    const token = await getAccessToken();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      ...(token ? { 'x-privy-token': token } : {}),
    };
  }, [getAccessToken]);

  const fetchAccounts = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) { setIsAdmin(false); setLoading(false); return; }
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        'x-privy-token': token,
      };
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
        if (resp.status === 403) toast.error("Access denied: super admin only");
      }
    } catch {
      toast.error("Failed to load accounts");
    } finally {
      setLoading(false);
    }
  }, [user?.id, getAccessToken]);

  const fetchSources = useCallback(async () => {
    setSourcesLoading(true);
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-sources?action=list`,
        { headers }
      );
      const data = await resp.json();
      if (resp.ok && data.sources) setSources(data.sources);
    } catch {
      toast.error("Failed to load sources");
    } finally {
      setSourcesLoading(false);
    }
  }, [getAuthHeaders]);

  const fetchFeedback = useCallback(async () => {
    setFeedbackLoading(true);
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-sources?action=list-feedback&type=negative&reviewed=false`,
        { headers }
      );
      const data = await resp.json();
      if (resp.ok && data.feedback) setNegativeFeedback(data.feedback);
    } catch {
      toast.error("Failed to load feedback");
    } finally {
      setFeedbackLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    if (authenticated && user?.id) fetchAccounts();
  }, [authenticated, user?.id, fetchAccounts]);

  useEffect(() => {
    if (isAdmin) {
      fetchSources();
      fetchFeedback();
    }
  }, [isAdmin, fetchSources, fetchFeedback]);

  const handleUpdateTier = async (targetUserId: string, newTier: string) => {
    if (!user?.id) return;
    setActionLoading(`tier-${targetUserId}`);
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-accounts?action=update-tier`,
        { method: "POST", headers, body: JSON.stringify({ targetUserId, newTier }) }
      );
      if (resp.ok) { toast.success(`Tier updated to ${newTier}`); fetchAccounts(); }
      else toast.error("Failed to update tier");
    } catch { toast.error("Failed to update tier"); }
    finally { setActionLoading(null); }
  };

  const handleResetUsage = async (targetUserId: string) => {
    if (!user?.id) return;
    setActionLoading(`reset-${targetUserId}`);
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-accounts?action=reset-usage`,
        { method: "POST", headers, body: JSON.stringify({ targetUserId }) }
      );
      if (resp.ok) { toast.success("Usage reset"); fetchAccounts(); }
      else toast.error("Failed to reset usage");
    } catch { toast.error("Failed to reset usage"); }
    finally { setActionLoading(null); }
  };

  // Source management
  const handleAddSource = async () => {
    if (!newSourceUrl.trim() || !newSourceLabel.trim()) return;
    setAddingSource(true);
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-sources?action=add`,
        { method: "POST", headers, body: JSON.stringify({ url: newSourceUrl.trim(), label: newSourceLabel.trim() }) }
      );
      if (resp.ok) {
        toast.success("Source added");
        setNewSourceUrl("");
        setNewSourceLabel("");
        fetchSources();
      } else {
        const data = await resp.json();
        toast.error(data.error || "Failed to add source");
      }
    } catch { toast.error("Failed to add source"); }
    finally { setAddingSource(false); }
  };

  const handleToggleSource = async (id: string, is_active: boolean) => {
    try {
      const headers = await getAuthHeaders();
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-sources?action=toggle`,
        { method: "POST", headers, body: JSON.stringify({ id, is_active }) }
      );
      setSources(prev => prev.map(s => s.id === id ? { ...s, is_active } : s));
    } catch { toast.error("Failed to toggle source"); }
  };

  const handleDeleteSource = async (id: string) => {
    try {
      const headers = await getAuthHeaders();
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-sources?action=delete`,
        { method: "POST", headers, body: JSON.stringify({ id }) }
      );
      setSources(prev => prev.filter(s => s.id !== id));
      toast.success("Source removed");
    } catch { toast.error("Failed to delete source"); }
  };

  // Feedback review
  const handleReviewFeedback = async (id: string, override?: string) => {
    try {
      const headers = await getAuthHeaders();
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-sources?action=review-feedback`,
        { method: "POST", headers, body: JSON.stringify({ id, admin_override: override || null }) }
      );
      setNegativeFeedback(prev => prev.filter(f => f.id !== id));
      toast.success(override ? "Override saved" : "Feedback confirmed");
    } catch { toast.error("Failed to review feedback"); }
  };

  // Initialize tierOverride
  useEffect(() => {
    if (isSuperAdmin && !tierOverride) setTierOverride('free');
  }, [isSuperAdmin, tierOverride, setTierOverride]);

  // Chat history functions
  const fetchHistoryUsers = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-history?action=admin-list-users`,
        { headers }
      );
      const data = await resp.json();
      if (resp.ok && data.users) setHistoryUsers(data.users);
    } catch { console.error("Failed to fetch history users"); }
  }, [getAuthHeaders]);

  const fetchUserHistory = useCallback(async (userId: string) => {
    setHistoryLoading(true);
    setSelectedHistoryUser(userId);
    try {
      const headers = await getAuthHeaders();
      const [sessResp, fbResp] = await Promise.all([
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-history?action=list-sessions&userId=${encodeURIComponent(userId)}`, { headers }),
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-history?action=list-feedback&userId=${encodeURIComponent(userId)}`, { headers }),
      ]);
      const data = await sessResp.json();
      if (sessResp.ok && data.sessions) setHistorySessions(data.sessions);
      const fbData = await fbResp.json().catch(() => ({ feedback: [] }));
      if (fbData.feedback) {
        const map: Record<string, { type: string; reviewed: boolean; hasOverride: boolean }> = {};
        for (const fb of fbData.feedback) {
          const key = fb.user_query?.trim().toLowerCase() || "";
          if (key) map[key] = { type: fb.feedback_type, reviewed: fb.admin_reviewed ?? false, hasOverride: !!fb.admin_override };
        }
        setHistoryFeedbackMap(map);
      }
    } catch { console.error("Failed to fetch user history"); }
    finally { setHistoryLoading(false); }
  }, [getAuthHeaders]);

  const handleAdminDeleteSession = async (sessionId: string) => {
    setDeletingHistorySession(sessionId);
    try {
      const headers = await getAuthHeaders();
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-history?action=admin-delete`,
        { method: "POST", headers, body: JSON.stringify({ sessionId }) }
      );
      setHistorySessions(prev => prev.filter(s => s.session_id !== sessionId));
      toast.success("Session permanently deleted");
    } catch { toast.error("Failed to delete session"); }
    finally { setDeletingHistorySession(null); }
  };

  useEffect(() => {
    if (isAdmin) fetchHistoryUsers();
  }, [isAdmin, fetchHistoryUsers]);

  const handleTierSwitch = (selectedTier: UserTier) => {
    if (tierOverride === selectedTier) return;
    setTierOverride(selectedTier);
    toast.success(`Testing as ${selectedTier === 'nft_holder' ? 'NFT Holder' : selectedTier === 'paid' ? 'Paid' : 'Free'} user`);
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
            <Button variant="outline" size="sm" onClick={() => { fetchAccounts(); fetchSources(); fetchFeedback(); fetchHistoryUsers(); }} disabled={loading}>
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
            {/* Profile Testing Mode */}
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
                          isActive ? 'border-primary bg-primary/10 shadow-sm' : 'border-border/50 bg-card/50 hover:border-border'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                          <div>
                            <p className={`text-sm font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</p>
                            <p className="text-xs text-muted-foreground">{description}</p>
                          </div>
                        </div>
                        <Switch checked={isActive} onCheckedChange={() => handleTierSwitch(key)} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Data Sources Management */}
            <div className="rounded-xl border border-border/50 bg-card/30 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Globe className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Official Data Sources</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {sources.filter(s => s.is_active).length} active
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-5">
                These URLs are scraped by Firecrawl to build quackGPT's knowledge base. Toggle to enable/disable.
              </p>

              {sourcesLoading ? (
                <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
              ) : (
                <div className="space-y-2 mb-4">
                  {sources.map(source => (
                    <div key={source.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${source.is_active ? 'border-border/50 bg-card/50' : 'border-border/30 bg-muted/20 opacity-60'}`}>
                      <Switch checked={source.is_active} onCheckedChange={(checked) => handleToggleSource(source.id, checked)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{source.label}</p>
                        <p className="text-xs text-muted-foreground truncate">{source.url}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteSource(source.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new source */}
              <div className="flex gap-2 mt-4">
                <Input
                  placeholder="https://example.com"
                  value={newSourceUrl}
                  onChange={(e) => setNewSourceUrl(e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="Label"
                  value={newSourceLabel}
                  onChange={(e) => setNewSourceLabel(e.target.value)}
                  className="w-40"
                />
                <Button onClick={handleAddSource} disabled={addingSource || !newSourceUrl.trim() || !newSourceLabel.trim()} size="sm" className="shrink-0 gap-1">
                  {addingSource ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                  Add
                </Button>
              </div>
            </div>

            {/* Negative Feedback Review */}
            <div className="rounded-xl border border-border/50 bg-card/30 p-6">
              <div className="flex items-center gap-3 mb-4">
                <ThumbsDown className="w-5 h-5 text-destructive" />
                <h2 className="text-lg font-semibold text-foreground">Feedback Review</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/20 text-destructive">
                  {negativeFeedback.length} unreviewed
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-5">
                Negatively rated responses for review. Confirm to acknowledge or override with a corrected answer to tune the LLM.
              </p>

              {feedbackLoading ? (
                <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
              ) : negativeFeedback.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No unreviewed negative feedback 🎉</p>
              ) : (
                <div className="space-y-4">
                  {negativeFeedback.map(item => (
                    <div key={item.id} className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                      {item.user_query && (
                        <div className="mb-2">
                          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" /> User asked:
                          </p>
                          <p className="text-sm text-foreground/80 bg-muted/30 rounded px-2 py-1">{item.user_query}</p>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mb-1">quackGPT responded:</p>
                      <p className="text-sm text-foreground/80 mb-3 line-clamp-4">{item.message_content}</p>
                      <p className="text-[10px] text-muted-foreground mb-3">
                        {new Date(item.created_at).toLocaleString()} • {shortenId(item.external_user_id)}
                      </p>

                      <div className="flex gap-2 items-end">
                        <Input
                          placeholder="Override with corrected answer (optional)..."
                          value={overrideText[item.id] || ""}
                          onChange={(e) => setOverrideText(prev => ({ ...prev, [item.id]: e.target.value }))}
                          className="flex-1 text-xs h-8"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1 text-xs"
                          onClick={() => handleReviewFeedback(item.id, overrideText[item.id])}
                        >
                          {overrideText[item.id] ? <><Check className="w-3 h-3" /> Override</> : <><Check className="w-3 h-3" /> Confirm</>}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-muted-foreground"
                          onClick={() => handleReviewFeedback(item.id)}
                        >
                          <X className="w-3 h-3" /> Dismiss
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Chat History Viewer */}
            <div className="rounded-xl border border-border/50 bg-card/30 p-6">
              <div className="flex items-center gap-3 mb-4">
                <History className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Chat History</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {historyUsers.length} users
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-5">
                View all user chat sessions. User-deleted sessions are flagged but preserved here until you permanently delete them.
              </p>

              {/* User selector */}
              <div className="flex flex-wrap gap-2 mb-4">
                {historyUsers.map(uid => (
                  <Button
                    key={uid}
                    variant={selectedHistoryUser === uid ? "default" : "outline"}
                    size="sm"
                    className="text-xs gap-1"
                    onClick={() => fetchUserHistory(uid)}
                  >
                    <User className="w-3 h-3" />
                    {uid.length > 16 ? `${uid.slice(0, 10)}…${uid.slice(-4)}` : uid}
                  </Button>
                ))}
                {historyUsers.length === 0 && (
                  <p className="text-sm text-muted-foreground">No chat history recorded yet.</p>
                )}
              </div>

              {/* Sessions list */}
              {selectedHistoryUser && (
                historyLoading ? (
                  <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                ) : historySessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No sessions for this user.</p>
                ) : (
                  <div className="max-h-[500px] overflow-y-auto rounded-lg border border-border/30 p-2 space-y-2">
                    {historySessions.map(session => {
                      const isExpanded = expandedHistorySession === session.session_id;
                      // Group messages into Q&A pairs
                      const pairs: { user: typeof session.messages[0]; assistant: typeof session.messages[0] | null }[] = [];
                      for (let i = 0; i < session.messages.length; i++) {
                        if (session.messages[i].role === 'user') {
                          const next = session.messages[i + 1];
                          pairs.push({
                            user: session.messages[i],
                            assistant: next?.role === 'assistant' ? next : null,
                          });
                          if (next?.role === 'assistant') i++;
                        }
                      }
                      return (
                        <div key={session.session_id} className={`rounded-lg border overflow-hidden ${session.user_deleted ? 'border-destructive/30 bg-destructive/5' : 'border-border/50 bg-card/50'}`}>
                          <div className="flex items-center gap-2 p-3">
                            <button
                              className="flex-1 flex items-center gap-2 text-left"
                              onClick={() => setExpandedHistorySession(isExpanded ? null : session.session_id)}
                            >
                              <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                              <div className="min-w-0">
                                <p className="text-xs text-foreground truncate">{session.preview || "Chat session"}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {new Date(session.created_at).toLocaleString()} • {pairs.length} {pairs.length === 1 ? 'exchange' : 'exchanges'}
                                  {session.user_deleted && <span className="text-destructive ml-1">(user deleted)</span>}
                                </p>
                              </div>
                            </button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                              onClick={() => handleAdminDeleteSession(session.session_id)}
                              disabled={deletingHistorySession === session.session_id}
                            >
                              {deletingHistorySession === session.session_id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Trash2 className="w-3 h-3" />
                              )}
                            </Button>
                          </div>
                          {isExpanded && (
                            <div className="border-t border-border/30 bg-muted/10">
                              <div className="max-h-80 overflow-y-auto p-3 space-y-3">
                                {pairs.map((pair, i) => {
                                  const fbKey = pair.user.content?.trim().toLowerCase() || "";
                                  const fb = fbKey ? historyFeedbackMap[fbKey] : null;
                                  return (
                                    <div key={i} className="rounded-md bg-card/60 border border-border/30 p-3 space-y-2">
                                      <div className="text-xs">
                                        <span className="font-semibold text-primary">User:</span>{' '}
                                        <span className="text-foreground/90">{pair.user.content}</span>
                                      </div>
                                      {pair.assistant && (
                                        <div className="text-xs">
                                          <span className="font-semibold text-muted-foreground">quackGPT:</span>{' '}
                                          <span className="text-foreground/70">{pair.assistant.content}</span>
                                        </div>
                                      )}
                                      {fb && (
                                        <div className="flex items-center gap-2 pt-1 border-t border-border/20">
                                          {fb.type === "positive" ? <ThumbsUp className="w-3 h-3 text-green-500" /> : <ThumbsDown className="w-3 h-3 text-destructive" />}
                                          <span className="text-[10px] text-muted-foreground">{fb.type === "positive" ? "Liked" : "Disliked"}</span>
                                          {fb.type === "negative" && (
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${fb.reviewed || fb.hasOverride ? 'bg-green-500/20 text-green-500' : 'bg-destructive/20 text-destructive'}`}>
                                              {fb.reviewed || fb.hasOverride ? 'Responded' : 'Needs Response'}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </div>

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
      <Footer />
    </div>
  );
}
