import { ScrollBendContainer } from "@/components/ScrollBendContainer";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import { AdminUserManager } from "@/components/AdminUserManager";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, RefreshCw, Shield, Zap, Crown, FlaskConical, Globe, Plus, Trash2, ThumbsDown, ThumbsUp, Check, X, MessageSquare, History, ChevronRight, User, ShieldAlert, ShieldCheck, AlertTriangle, Bell, BellOff, ScanSearch, Bird, Activity, Target, Eye, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState, useCallback, useRef } from "react";
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
  campaign: string;
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

interface SecurityScan {
  id: string;
  scan_type: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  findings: { severity: string; category: string; title: string; detail: string; component?: string; exploit_vector?: string; recommended_fix?: string; exploitability_score?: number; impact_score?: number; confidence_score?: number }[];
  summary: string | null;
  vulnerability_count: number;
  warning_count: number;
  ok_count: number;
  triggered_by: string | null;
  overall_score?: number;
}

interface SecurityFinding {
  id: string;
  scan_id: string;
  component: string;
  severity: string;
  category: string;
  title: string;
  description: string;
  exploit_vector: string | null;
  recommended_fix: string | null;
  status: string;
  exploitability_score: number;
  impact_score: number;
  confidence_score: number;
  auto_fix_available: boolean;
  created_at: string;
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
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Sources state
  const [sources, setSources] = useState<ScrapeSource[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [newSourceLabel, setNewSourceLabel] = useState("");
  const [addingSource, setAddingSource] = useState(false);
  const [sourcesCampaign, setSourcesCampaign] = useState<"wallchain" | "idos" | "beyond">("wallchain");

  // Feedback state
  const [negativeFeedback, setNegativeFeedback] = useState<FeedbackItem[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [overrideText, setOverrideText] = useState<Record<string, string>>({});
  const [expandedFeedback, setExpandedFeedback] = useState<Record<string, boolean>>({});
  // Chat history state
  const [historyUsers, setHistoryUsers] = useState<string[]>([]);
  const [historySessions, setHistorySessions] = useState<HistorySession[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistoryUser, setSelectedHistoryUser] = useState<string | null>(null);
  const [expandedHistorySession, setExpandedHistorySession] = useState<string | null>(null);
  const [deletingHistorySession, setDeletingHistorySession] = useState<string | null>(null);
  const [historyFeedbackMap, setHistoryFeedbackMap] = useState<Record<string, { type: string; reviewed: boolean; hasOverride: boolean }>>({});

  // Security scan state
  const [securityScans, setSecurityScans] = useState<SecurityScan[]>([]);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [scanRunning, setScanRunning] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Security findings state
  const [openFindings, setOpenFindings] = useState<SecurityFinding[]>([]);
  const [findingsLoading, setFindingsLoading] = useState(false);
  const [securityTab, setSecurityTab] = useState<"overview" | "findings" | "history">("overview");
  const [resolvingFinding, setResolvingFinding] = useState<string | null>(null);
  const [resolveNotes, setResolveNotes] = useState<Record<string, string>>({});

  // Tweet audit state
  const [adminAudits, setAdminAudits] = useState<any[]>([]);
  const [adminAuditsLoading, setAdminAuditsLoading] = useState(false);
  const [expandedAdminAudit, setExpandedAdminAudit] = useState<string | null>(null);

  const getAuthHeaders = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) {
      toast.error("Session expired. Please sign in again.");
      logout();
      throw new Error("No auth token");
    }
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      'x-privy-token': token,
    };
  }, [getAccessToken, logout]);

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

  const fetchSources = useCallback(async (campaign?: string) => {
    setSourcesLoading(true);
    try {
      const headers = await getAuthHeaders();
      const c = campaign || sourcesCampaign;
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-sources?action=list&campaign=${c}`,
        { headers }
      );
      const data = await resp.json();
      if (resp.ok && data.sources) setSources(data.sources);
    } catch {
      toast.error("Failed to load sources");
    } finally {
      setSourcesLoading(false);
    }
  }, [getAuthHeaders, sourcesCampaign]);

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
        { method: "POST", headers, body: JSON.stringify({ url: newSourceUrl.trim(), label: newSourceLabel.trim(), campaign: sourcesCampaign }) }
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

  // Fetch all tweet audits for admin
  const fetchAdminAudits = useCallback(async () => {
    setAdminAuditsLoading(true);
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-history?action=admin-list-audits`,
        { headers }
      );
      const data = await resp.json();
      if (resp.ok && data.audits) setAdminAudits(data.audits);
    } catch { console.error("Failed to fetch admin audits"); }
    finally { setAdminAuditsLoading(false); }
  }, [getAuthHeaders]);

  useEffect(() => {
    if (isAdmin) fetchAdminAudits();
  }, [isAdmin, fetchAdminAudits]);

  // Security scan functions
  const fetchSecurityScans = useCallback(async () => {
    setSecurityLoading(true);
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/security-scan?action=list`,
        { headers }
      );
      const data = await resp.json();
      if (resp.ok && data.scans) setSecurityScans(data.scans);
    } catch { console.error("Failed to fetch security scans"); }
    finally { setSecurityLoading(false); }
  }, [getAuthHeaders]);

  const runSecurityScan = useCallback(async () => {
    setScanRunning(true);
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/security-scan?action=run`,
        { method: "POST", headers }
      );
      const data = await resp.json();
      if (resp.ok) {
        toast.success(data.scan?.summary || "Scan complete");
        // Notify on warnings OR critical vulnerabilities
        const hasWarnings = (data.scan?.warning_count || 0) > 0;
        const hasCritical = (data.scan?.vulnerability_count || 0) > 0;
        if ((hasWarnings || hasCritical) && "Notification" in window && Notification.permission === "granted") {
          const parts: string[] = [];
          if (hasCritical) parts.push(`${data.scan.vulnerability_count} critical`);
          if (hasWarnings) parts.push(`${data.scan.warning_count} warning(s)`);
          try {
            new Notification("🔴 QuackGPT Security Alert", {
              body: parts.join(", ") + " detected!",
              icon: "/favicon.ico",
            });
          } catch { /* browser may not support */ }
        }
        fetchSecurityScans();
        fetchOpenFindings();
      } else {
        toast.error(data.error || "Scan failed");
      }
    } catch { toast.error("Failed to run security scan"); }
    finally { setScanRunning(false); }
  }, [getAuthHeaders, notificationsEnabled, fetchSecurityScans]);

  // Fetch open findings
  const fetchOpenFindings = useCallback(async () => {
    setFindingsLoading(true);
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/security-scan?action=list-findings&status=open`,
        { headers }
      );
      const data = await resp.json();
      if (resp.ok && data.findings) setOpenFindings(data.findings);
    } catch { console.error("Failed to fetch findings"); }
    finally { setFindingsLoading(false); }
  }, [getAuthHeaders]);

  // Resolve / acknowledge a finding
  const handleResolveFinding = useCallback(async (findingId: string, newStatus: string) => {
    setResolvingFinding(findingId);
    try {
      const headers = await getAuthHeaders();
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/security-scan?action=resolve-finding`,
        { method: "POST", headers, body: JSON.stringify({ findingId, status: newStatus, resolution_notes: resolveNotes[findingId] || "" }) }
      );
      toast.success(`Finding ${newStatus}`);
      setOpenFindings(prev => prev.filter(f => f.id !== findingId));
    } catch { toast.error("Failed to update finding"); }
    finally { setResolvingFinding(null); }
  }, [getAuthHeaders, resolveNotes]);

  // Auto-enable in-app alerts for super admin
  useEffect(() => {
    if (!authenticated || !isAdmin || !isSuperAdmin) return;
    setNotificationsEnabled(true);
    // Try browser notifications if available, but don't error if unsupported
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, [authenticated, isAdmin, isSuperAdmin]);

  // Fetch scans and set up hourly auto-scan
  useEffect(() => {
    if (isAdmin) {
      fetchSecurityScans();
      fetchOpenFindings();
      scanIntervalRef.current = setInterval(() => {
        runSecurityScan();
      }, 60 * 60 * 1000);
      return () => {
        if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
      };
    }
  }, [isAdmin, fetchSecurityScans, runSecurityScan, fetchOpenFindings]);

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

        <h1 className="text-2xl font-display font-bold text-foreground mb-4 text-center">Admin Dashboard</h1>
        <div className="flex items-center justify-end mb-8">
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => { fetchAccounts(); fetchSources(); fetchFeedback(); fetchHistoryUsers(); fetchAdminAudits(); }} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          )}
        </div>

        {!authenticated ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">Sign in to access admin panel</p>
            <Button onClick={login} variant="hero">Sign In</Button>
          </div>
        ) : loading || isAdmin === null ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !isAdmin ? (
          <div className="text-center py-12">
            <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Access restricted to super administrators.</p>
          </div>
        ) : (
          <ScrollBendContainer className="space-y-8">
            {/* Profile Testing Mode */}
            {isSuperAdmin && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <FlaskConical className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold text-foreground text-center flex-1">Profile Testing Mode</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{tierOverride ? 'Test' : 'Live'}</span>
                    <Switch
                      checked={!!tierOverride}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setTierOverride('free');
                          toast.success('Test mode enabled — simulating Free tier');
                        } else {
                          setTierOverride(null);
                          toast.success('Test mode disabled — using real subscription/NFT status');
                        }
                      }}
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-5">
                  {tierOverride 
                    ? "Test mode active — simulating different user tiers. Your account will behave as the selected tier across the entire app."
                    : "Test mode off — using your real subscription and NFT verification status."
                  }
                </p>
                {tierOverride && (
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
                )}
              </div>
            )}

            {/* Security Command Center */}
            {isSuperAdmin && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <ScanSearch className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold text-foreground text-center flex-1">Security Command Center</h2>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      title={notificationsEnabled ? "Click to disable notifications" : "Click to enable notifications"}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={async () => {
                        if (notificationsEnabled) {
                          setNotificationsEnabled(false);
                          toast.info("In-app security alerts disabled");
                        } else {
                          setNotificationsEnabled(true);
                          toast.success("In-app security alerts enabled");
                          // Also try browser notifications if available
                          if ("Notification" in window && Notification.permission === "default") {
                            try {
                              await Notification.requestPermission();
                            } catch { /* ignore — browser may not support */ }
                          }
                        }
                      }}
                    >
                      {notificationsEnabled ? (
                        <Bell className="w-4 h-4 text-primary" />
                      ) : (
                        <BellOff className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Overall Security Score */}
                {securityScans.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                    <div className="rounded-lg border border-border/50 bg-card/50 p-3 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Security Score</p>
                      <p className={`text-2xl font-bold font-mono ${
                        (securityScans[0]?.overall_score ?? 100) >= 80 ? "text-primary"
                        : (securityScans[0]?.overall_score ?? 100) >= 50 ? "text-amber-500"
                        : "text-destructive"
                      }`}>
                        {securityScans[0]?.overall_score ?? 100}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border/50 bg-card/50 p-3 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Open Findings</p>
                      <p className={`text-2xl font-bold font-mono ${openFindings.length > 0 ? "text-destructive" : "text-primary"}`}>
                        {openFindings.length}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border/50 bg-card/50 p-3 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Scans (24h)</p>
                      <p className="text-2xl font-bold font-mono text-foreground">{securityScans.length}</p>
                    </div>
                    <div className="rounded-lg border border-border/50 bg-card/50 p-3 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Last Scan</p>
                      <p className="text-xs font-medium text-foreground mt-1">
                        {securityScans[0]?.completed_at
                          ? new Date(securityScans[0].completed_at).toLocaleTimeString()
                          : "—"}
                      </p>
                    </div>
                  </div>
                )}

                {/* 7-day trend (mini spark line using recent scans) */}
                {securityScans.length > 1 && (
                  <div className="mb-5 rounded-lg border border-border/30 bg-card/30 p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                      <Activity className="w-3 h-3" /> Score Trend
                    </p>
                    <div className="flex items-end gap-1 h-10">
                      {[...securityScans].reverse().slice(-12).map((scan, i) => {
                        const score = scan.overall_score ?? 100;
                        const height = Math.max(4, (score / 100) * 40);
                        return (
                          <div
                            key={i}
                            className={`flex-1 rounded-sm transition-all ${
                              score >= 80 ? "bg-primary/60" : score >= 50 ? "bg-amber-500/60" : "bg-destructive/60"
                            }`}
                            style={{ height: `${height}px` }}
                            title={`${new Date(scan.started_at).toLocaleString()}: ${score}/100`}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tab switcher */}
                <div className="flex gap-1 mb-4 rounded-lg bg-muted/30 p-1">
                  {(["overview", "findings", "history"] as const).map(tab => (
                    <button
                      key={tab}
                      className={`flex-1 text-xs py-1.5 px-2 rounded-md transition-colors capitalize ${
                        securityTab === tab ? "bg-primary/20 text-primary font-medium" : "text-muted-foreground hover:text-foreground"
                      }`}
                      onClick={() => setSecurityTab(tab)}
                    >
                      {tab === "overview" && <Shield className="w-3 h-3 inline mr-1" />}
                      {tab === "findings" && <Target className="w-3 h-3 inline mr-1" />}
                      {tab === "history" && <Clock className="w-3 h-3 inline mr-1" />}
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Run Scan button */}
                <div className="flex justify-center mb-5">
                  <Button
                    variant="hero"
                    size="sm"
                    onClick={runSecurityScan}
                    disabled={scanRunning}
                    className="gap-2"
                  >
                    {scanRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                    {scanRunning ? "Scanning…" : "Run Full Scan"}
                  </Button>
                </div>

                {/* Overview Tab - latest scan findings */}
                {securityTab === "overview" && (
                  securityLoading ? (
                    <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                  ) : securityScans.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No scan reports yet. Run your first scan above.</p>
                  ) : (
                    <div className="space-y-3">
                      {securityScans[0]?.summary && (
                        <div className="p-3 rounded-lg border border-border/30 bg-card/50">
                          <p className="text-xs font-medium text-foreground">{securityScans[0].summary}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {new Date(securityScans[0].started_at).toLocaleDateString()} · {new Date(securityScans[0].started_at).toLocaleTimeString()}
                          </p>
                        </div>
                      )}
                      {securityScans[0]?.findings && (
                        <div className="max-h-[400px] overflow-y-auto rounded-lg border border-border/30 p-2 space-y-2">
                          {securityScans[0].findings
                            .filter(f => f.severity !== "ok")
                            .map((f, fi) => (
                            <div key={fi} className={`text-xs rounded-md px-3 py-2 ${
                              f.severity === "critical" ? "bg-destructive/10 border border-destructive/20"
                              : f.severity === "high" ? "bg-destructive/5 border border-destructive/10"
                              : f.severity === "warning" ? "bg-amber-500/10 border border-amber-500/20"
                              : f.severity === "info" ? "bg-blue-500/10 border border-blue-500/20"
                              : "bg-primary/5 border border-border/30"
                            }`}>
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className={`font-semibold uppercase text-[10px] ${
                                  f.severity === "critical" ? "text-destructive"
                                  : f.severity === "high" ? "text-destructive/80"
                                  : f.severity === "warning" ? "text-amber-500"
                                  : f.severity === "info" ? "text-blue-500"
                                  : "text-primary"
                                }`}>{f.severity}</span>
                                <span className="text-muted-foreground">·</span>
                                <span className="text-muted-foreground">{f.category}</span>
                                {f.component && <span className="text-muted-foreground/60 text-[9px]">({f.component})</span>}
                              </div>
                              <p className="text-foreground font-medium">{f.title}</p>
                              <p className="text-muted-foreground mt-0.5">{f.detail}</p>
                              {f.exploit_vector && (
                                <p className="text-destructive/70 mt-1 text-[10px]">⚡ Vector: {f.exploit_vector}</p>
                              )}
                              {f.recommended_fix && (
                                <p className="text-primary/70 mt-0.5 text-[10px]">💡 Fix: {f.recommended_fix}</p>
                              )}
                              {(f.exploitability_score || f.impact_score || f.confidence_score) ? (
                                <div className="flex gap-3 mt-1 text-[9px] text-muted-foreground">
                                  {f.exploitability_score ? <span>Exploit: {f.exploitability_score}/10</span> : null}
                                  {f.impact_score ? <span>Impact: {f.impact_score}/10</span> : null}
                                  {f.confidence_score ? <span>Confidence: {f.confidence_score}%</span> : null}
                                </div>
                              ) : null}
                            </div>
                          ))}
                          {securityScans[0].findings.filter(f => f.severity !== "ok").length === 0 && (
                            <div className="text-center py-4">
                              <p className="text-sm text-primary">✅ All clear — no active issues</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                )}

                {/* Findings Tab - open findings with resolve/acknowledge */}
                {securityTab === "findings" && (
                  findingsLoading ? (
                    <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                  ) : openFindings.length === 0 ? (
                    <div className="text-center py-6">
                      <CheckCircle2 className="w-8 h-8 text-primary mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No open findings 🎉</p>
                    </div>
                  ) : (
                    <div className="max-h-[500px] overflow-y-auto rounded-lg border border-border/30 p-2 space-y-3">
                      {openFindings.map(finding => (
                        <div key={finding.id} className={`rounded-lg border p-3 ${
                          finding.severity === "critical" ? "border-destructive/30 bg-destructive/5"
                          : finding.severity === "high" ? "border-destructive/20 bg-destructive/5"
                          : "border-amber-500/20 bg-amber-500/5"
                        }`}>
                          <div className="flex items-start gap-2 mb-2">
                            <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                              finding.severity === "critical" ? "bg-destructive/20 text-destructive"
                              : finding.severity === "high" ? "bg-destructive/15 text-destructive/80"
                              : "bg-amber-500/20 text-amber-500"
                            }`}>{finding.severity}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-foreground">{finding.title}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{finding.component} · {finding.category}</p>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{finding.description}</p>
                          {finding.exploit_vector && (
                            <p className="text-[10px] text-destructive/70 mb-1">⚡ {finding.exploit_vector}</p>
                          )}
                          {finding.recommended_fix && (
                            <p className="text-[10px] text-primary/70 mb-2">💡 {finding.recommended_fix}</p>
                          )}
                          <div className="flex gap-3 mb-2 text-[9px] text-muted-foreground">
                            <span>Exploit: {finding.exploitability_score}/10</span>
                            <span>Impact: {finding.impact_score}/10</span>
                            <span>Confidence: {finding.confidence_score}%</span>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end border-t border-border/20 pt-2 mt-2">
                            <Input
                              placeholder="Resolution notes..."
                              value={resolveNotes[finding.id] || ""}
                              onChange={(e) => setResolveNotes(prev => ({ ...prev, [finding.id]: e.target.value }))}
                              className="flex-1 text-xs h-7"
                            />
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-[10px] gap-1 flex-1 sm:flex-none"
                                disabled={resolvingFinding === finding.id}
                                onClick={() => handleResolveFinding(finding.id, "acknowledged")}
                              >
                                {resolvingFinding === finding.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                                Acknowledge
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-[10px] gap-1 border-primary/30 text-primary flex-1 sm:flex-none"
                                disabled={resolvingFinding === finding.id}
                                onClick={() => handleResolveFinding(finding.id, "resolved")}
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                Resolve
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {/* History Tab - scan archive */}
                {securityTab === "history" && (
                  securityLoading ? (
                    <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                  ) : securityScans.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No scan reports yet.</p>
                  ) : (
                    <div className="max-h-[400px] overflow-y-auto rounded-lg border border-border/30 p-2 space-y-3">
                      {securityScans.map((scan, idx) => (
                        <details
                          key={scan.id}
                          className={`rounded-lg border overflow-hidden ${
                            scan.vulnerability_count > 0
                              ? "border-destructive/30 bg-destructive/5"
                              : scan.warning_count > 0
                              ? "border-amber-500/30 bg-amber-500/5"
                              : "border-border/50 bg-card/50"
                          }`}
                          open={idx === 0}
                        >
                          <summary className="flex items-center gap-2 p-3 cursor-pointer hover:bg-muted/20 transition-colors">
                            {scan.vulnerability_count > 0 ? (
                              <ShieldAlert className="w-4 h-4 text-destructive shrink-0" />
                            ) : scan.warning_count > 0 ? (
                              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                            ) : (
                              <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-foreground">
                                {scan.scan_type === "scheduled" ? "Scheduled" : "Manual"} Scan
                                <span className="text-muted-foreground font-normal ml-2">
                                  {new Date(scan.started_at).toLocaleString()}
                                </span>
                              </p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                Score: <span className={`font-mono font-medium ${(scan.overall_score ?? 100) >= 80 ? "text-primary" : (scan.overall_score ?? 100) >= 50 ? "text-amber-500" : "text-destructive"}`}>{scan.overall_score ?? 100}</span>
                                {" · "}
                                {scan.vulnerability_count > 0 && <span className="text-destructive font-medium">{scan.vulnerability_count} critical</span>}
                                {scan.vulnerability_count > 0 && scan.warning_count > 0 && " · "}
                                {scan.warning_count > 0 && <span className="text-amber-500 font-medium">{scan.warning_count} warning{scan.warning_count !== 1 ? "s" : ""}</span>}
                                {(scan.vulnerability_count > 0 || scan.warning_count > 0) && " · "}
                                <span className="text-primary">{scan.ok_count} passed</span>
                              </p>
                            </div>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                              scan.status === "completed"
                                ? scan.vulnerability_count > 0
                                  ? "bg-destructive/20 text-destructive"
                                  : "bg-primary/20 text-primary"
                                : "bg-muted text-muted-foreground"
                            }`}>
                              {scan.status}
                            </span>
                          </summary>
                          {scan.findings && scan.findings.length > 0 && (
                            <div className="border-t border-border/30 p-3 space-y-2">
                              {scan.summary && (
                                <p className="text-xs font-medium text-foreground mb-2">{scan.summary}</p>
                              )}
                              {scan.findings.filter(f => f.severity !== "ok").map((f, fi) => (
                                <div key={fi} className={`text-xs rounded-md px-3 py-2 ${
                                  f.severity === "critical"
                                    ? "bg-destructive/10 border border-destructive/20"
                                    : f.severity === "warning"
                                    ? "bg-amber-500/10 border border-amber-500/20"
                                    : f.severity === "info"
                                    ? "bg-blue-500/10 border border-blue-500/20"
                                    : "bg-primary/5 border border-border/30"
                                }`}>
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span className={`font-semibold uppercase text-[10px] ${
                                      f.severity === "critical" ? "text-destructive"
                                        : f.severity === "warning" ? "text-amber-500"
                                        : f.severity === "info" ? "text-blue-500"
                                        : "text-primary"
                                    }`}>{f.severity}</span>
                                    <span className="text-muted-foreground">·</span>
                                    <span className="text-muted-foreground">{f.category}</span>
                                  </div>
                                  <p className="text-foreground font-medium">{f.title}</p>
                                  <p className="text-muted-foreground mt-0.5">{f.detail}</p>
                                </div>
                              ))}
                              {scan.findings.filter(f => f.severity !== "ok").length === 0 && (
                                <p className="text-sm text-primary text-center py-3">✅ All clear — no issues in this scan</p>
                              )}
                            </div>
                          )}
                        </details>
                      ))}
                    </div>
                  )
                )}
              </div>
            )}

            {/* Data Sources Management */}
            <div className="border-y border-border/50 bg-card/30 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Globe className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground text-center flex-1">Official Data Sources</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {sources.filter(s => s.is_active).length} active
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                These URLs are scraped by Firecrawl to build quackGPT's knowledge base per campaign. Toggle to enable/disable.
              </p>

              {/* Campaign tabs */}
              <div className="flex gap-1 mb-4 rounded-lg bg-muted/30 p-1">
                {([
                  { key: "wallchain" as const, label: "Wallchain", activeClass: "bg-yellow-500/20 text-yellow-400" },
                  { key: "idos" as const, label: "idOS Network", activeClass: "bg-emerald-500/20 text-emerald-400" },
                  { key: "beyond" as const, label: "Beyond", activeClass: "bg-orange-500/20 text-orange-400" },
                ] as const).map(tab => (
                  <button
                    key={tab.key}
                    className={`flex-1 text-xs py-1.5 px-2 rounded-md transition-colors font-medium ${
                      sourcesCampaign === tab.key ? tab.activeClass : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => { setSourcesCampaign(tab.key); fetchSources(tab.key); }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {sourcesLoading ? (
                <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
              ) : (
                <div className="space-y-2 mb-4 max-h-[300px] overflow-y-auto rounded-lg border border-border/30 p-2">
                  {sources.map(source => {
                    const sourceContainerStyles: Record<string, React.CSSProperties> = {
                      wallchain: { backgroundColor: 'rgba(234, 179, 8, 0.1)', borderLeft: '3px solid rgb(234, 179, 8)' },
                      idos: { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderLeft: '3px solid rgb(16, 185, 129)' },
                      beyond: { backgroundColor: 'rgba(249, 115, 22, 0.1)', borderLeft: '3px solid rgb(249, 115, 22)' },
                    };
                    return (
                    <div key={source.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${source.is_active ? 'border-border/50' : 'border-border/30 opacity-60'}`} style={sourceContainerStyles[sourcesCampaign] || sourceContainerStyles.wallchain}>
                      <Switch checked={source.is_active} onCheckedChange={(checked) => handleToggleSource(source.id, checked)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{source.label}</p>
                        <p className="text-xs text-muted-foreground truncate">{source.url}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteSource(source.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    );
                  })}
                </div>
              )}

              {/* Add new source */}
              <div className="flex flex-col sm:flex-row gap-2 mt-4">
                <Input
                  placeholder="https://example.com"
                  value={newSourceUrl}
                  onChange={(e) => setNewSourceUrl(e.target.value)}
                  className="flex-1"
                />
                <div className="flex gap-2">
                  <Input
                    placeholder="Label"
                    value={newSourceLabel}
                    onChange={(e) => setNewSourceLabel(e.target.value)}
                    className="flex-1 sm:w-40"
                  />
                  <Button onClick={handleAddSource} disabled={addingSource || !newSourceUrl.trim() || !newSourceLabel.trim()} size="sm" className="shrink-0 gap-1">
                    {addingSource ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                    Add
                  </Button>
                </div>
              </div>
            </div>

            {/* Negative Feedback Review */}
            <div className="border-y border-border/50 bg-card/30 p-6">
              <div className="flex items-center gap-3 mb-4">
                <ThumbsDown className="w-5 h-5 text-destructive" />
                <h2 className="text-lg font-semibold text-foreground text-center flex-1">Feedback Review</h2>
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
                      <p className="text-xs text-muted-foreground mb-1 cursor-pointer flex items-center gap-1" onClick={() => setExpandedFeedback(prev => ({ ...prev, [item.id]: !prev[item.id] }))}>
                        quackGPT responded: <span className="text-[10px] text-primary ml-1">{expandedFeedback[item.id] ? '▼ collapse' : '▶ expand full'}</span>
                      </p>
                      <p className={`text-sm text-foreground/80 mb-3 ${expandedFeedback[item.id] ? '' : 'line-clamp-4'} cursor-pointer`} onClick={() => setExpandedFeedback(prev => ({ ...prev, [item.id]: !prev[item.id] }))}>{item.message_content}</p>
                      <p className="text-[10px] text-muted-foreground mb-3">
                        {new Date(item.created_at).toLocaleString()} • {shortenId(item.external_user_id)}
                      </p>

                      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
                        <Input
                          placeholder="Override with corrected answer (optional)..."
                          value={overrideText[item.id] || ""}
                          onChange={(e) => setOverrideText(prev => ({ ...prev, [item.id]: e.target.value }))}
                          className="flex-1 text-xs h-8"
                        />
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1 text-xs flex-1 sm:flex-none"
                            onClick={() => handleReviewFeedback(item.id, overrideText[item.id])}
                          >
                            {overrideText[item.id] ? <><Check className="w-3 h-3" /> Override</> : <><Check className="w-3 h-3" /> Confirm</>}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs text-muted-foreground flex-1 sm:flex-none"
                            onClick={() => handleReviewFeedback(item.id)}
                          >
                            <X className="w-3 h-3" /> Dismiss
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Chat History Viewer */}
            <div className="border-y border-border/50 bg-card/30 p-6">
              <div className="flex items-center gap-3 mb-4">
                <History className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground text-center flex-1">Chat History</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {historyUsers.length} users
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-5">
                View all user chat sessions. User-deleted sessions are flagged but preserved here until you permanently delete them.
              </p>

              {/* User selector */}
              <div className="max-h-[240px] overflow-y-auto rounded-lg border border-border/30 p-2 mb-4 space-y-1">
                {historyUsers.map(uid => (
                  <button
                    key={uid}
                    className={`w-full flex items-center gap-2 text-left text-xs px-3 py-2.5 rounded-lg transition-colors ${selectedHistoryUser === uid ? 'bg-primary/20 text-primary border border-primary/30' : 'hover:bg-muted/50 text-foreground'}`}
                    onClick={() => {
                      if (selectedHistoryUser === uid) {
                        setSelectedHistoryUser(null);
                        setHistorySessions([]);
                      } else {
                        fetchUserHistory(uid);
                      }
                    }}
                  >
                    <User className="w-3 h-3 shrink-0" />
                    <span className="truncate">{uid.length > 16 ? `${uid.slice(0, 10)}…${uid.slice(-4)}` : uid}</span>
                    <ChevronRight className={`w-3 h-3 ml-auto shrink-0 transition-transform ${selectedHistoryUser === uid ? 'rotate-90' : ''}`} />
                  </button>
                ))}
                {historyUsers.length === 0 && (
                  <p className="text-sm text-muted-foreground p-2">No chat history recorded yet.</p>
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
                        <div key={session.session_id} className={`rounded-lg border overflow-hidden ${session.user_deleted ? 'border-destructive/30' : 'border-border/50'}`} style={(() => {
                          const p = (session.preview || '').toUpperCase();
                          if (p.includes('[WALLCHAIN]') || p.includes('WALLCHAIN') || p.includes('INFOFI') || p.includes('QUACK')) return { backgroundColor: 'rgba(234, 179, 8, 0.15)', borderLeft: '4px solid rgb(234, 179, 8)' };
                          if (p.includes('[IDOS') || p.includes('IDOS')) return { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderLeft: '4px solid rgb(16, 185, 129)' };
                          if (p.includes('[BEYOND]') || p.includes('BEYOND')) return { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderLeft: '4px solid rgb(239, 68, 68)' };
                          return { backgroundColor: 'rgba(234, 179, 8, 0.15)', borderLeft: '4px solid rgb(234, 179, 8)' };
                        })()}>
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
                              <div className="max-h-[320px] overflow-y-auto p-3 space-y-3">
                                {pairs.map((pair, i) => {
                                  const fbKey = pair.user.content?.trim().toLowerCase() || "";
                                  const fb = fbKey ? historyFeedbackMap[fbKey] : null;
                                  return (
                                    <div key={i} className="rounded-md border border-border/30 p-3 space-y-2" style={(() => {
                                      const c = (pair.user.content || '').toUpperCase();
                                      if (c.includes('[WALLCHAIN]') || c.includes('WALLCHAIN') || c.includes('INFOFI') || c.includes('QUACK')) return { backgroundColor: 'rgba(234, 179, 8, 0.25)', borderLeft: '4px solid rgb(234, 179, 8)' };
                                      if (c.includes('[IDOS') || c.includes('IDOS')) return { backgroundColor: 'rgba(16, 185, 129, 0.25)', borderLeft: '4px solid rgb(16, 185, 129)' };
                                      if (c.includes('[BEYOND]') || c.includes('BEYOND')) return { backgroundColor: 'rgba(239, 68, 68, 0.25)', borderLeft: '4px solid rgb(239, 68, 68)' };
                                      return { backgroundColor: 'rgba(234, 179, 8, 0.25)', borderLeft: '4px solid rgb(234, 179, 8)' };
                                    })()}>
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

            {/* Tweet Audit History (Admin) */}
            <div className="border-y border-border/50 bg-card/30 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Bird className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground text-center flex-1">Tweet Audit History</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {adminAudits.length} audits
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-5">
                All tweet audit results across all users. Each audit deducts one query from the user's account.
              </p>

              {adminAuditsLoading ? (
                <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
              ) : adminAudits.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No tweet audits yet.</p>
              ) : (
                <div className="max-h-[400px] overflow-y-auto rounded-lg border border-border/30 p-2 space-y-2">
                  {adminAudits.map((audit: any) => {
                    const isExpanded = expandedAdminAudit === audit.id;
                    const scoreColor = audit.composite_score >= 75 ? "text-primary" : audit.composite_score >= 50 ? "text-amber-500" : "text-destructive";
                    return (
                      <div key={audit.id} className="rounded-lg border border-border/50 overflow-hidden" style={(() => {
                          const t = (audit.tweet_text || '').toUpperCase();
                          if (t.includes('IDOS') || t.includes('IDOS NETWORK')) return { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderLeft: '4px solid rgb(16, 185, 129)' };
                          if (t.includes('BEYOND')) return { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderLeft: '4px solid rgb(239, 68, 68)' };
                          return { backgroundColor: 'rgba(234, 179, 8, 0.15)', borderLeft: '4px solid rgb(234, 179, 8)' };
                        })()}>
                        <button
                          className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/30 transition-colors"
                          onClick={() => setExpandedAdminAudit(isExpanded ? null : audit.id)}
                        >
                          <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-foreground truncate">"{audit.tweet_text}"</p>
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(audit.created_at).toLocaleString()} • {audit.external_user_id ? shortenId(audit.external_user_id) : "—"}
                            </p>
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
            </div>

            {/* User Profiles Management */}
            <div className="border-y border-border/50 bg-card/30 p-6">
              <div className="flex items-center gap-3 mb-4">
                <User className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground text-center flex-1">User Profiles</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  Manage
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-5">
                View, edit, ban, or delete user profiles. Users can set their own display name and profile picture from their Settings page.
              </p>
              <AdminUserManager getAuthHeaders={getAuthHeaders} />
            </div>

            {/* Legacy User Accounts (tier/usage) */}
            <div className="border-y border-border/50 bg-card/30 p-6">
              <div className="flex items-center gap-3 mb-4">
                <User className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground text-center flex-1">User Accounts (Tiers)</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {accounts.length} total
                </span>
              </div>
              <div className="max-h-[280px] overflow-y-auto rounded-lg border border-border/30">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card z-10">
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
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-7 px-2"
                                disabled={actionLoading === `tier-${account.external_user_id}`}
                                onClick={() => {
                                  const tiers = ['free', 'paid', 'nft_holder'];
                                  const currentIndex = tiers.indexOf(account.tier);
                                  const nextTier = tiers[(currentIndex + 1) % tiers.length];
                                  if (account.external_user_id) handleUpdateTier(account.external_user_id, nextTier);
                                }}
                              >
                                {actionLoading === `tier-${account.external_user_id}` ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  account.tier
                                )}
                              </Button>
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
          </ScrollBendContainer>
        )}
      </main>
    </div>
  );
}
