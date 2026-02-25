import { useState, useCallback, useEffect } from "react";
import { ScrollBendContainer } from "./ScrollBendContainer";
import { QuackLogo } from "./QuackLogo";
import { TierBadge } from "./TierBadge";
import { UserTier, WHITELISTED_SOURCES } from "@/types";
import { Database, Shield, Zap, ChevronRight, Loader2, Trash2, ThumbsUp, ThumbsDown, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatMessage {
  role: string;
  content: string;
  created_at: string;
}

interface ChatSession {
  session_id: string;
  created_at: string;
  preview: string;
  messages: ChatMessage[];
  user_deleted: boolean;
}

interface WelcomeScreenProps {
  tier: UserTier;
  queriesRemaining: number;
  onQuerySelect?: (query: string) => void;
  isAuthenticated?: boolean;
  onLogin?: () => void;
  getAuthHeaders?: () => Promise<Record<string, string>>;
}

const features = [
  {
    icon: Database,
    title: "🔎 Search Mode",
    description: "Source-bound ecosystem intelligence from verified Wallchain channels.",
  },
  {
    icon: Shield,
    title: "🦆 Quack Check",
    description: "Fact-check claims with structured verdicts: TRUE, FALSE, UNVERIFIED.",
  },
  {
    icon: Zap,
    title: "🐦 Tweet Audit",
    description: "Score your tweets 0-100 on relevancy, correctness, honesty, authenticity & brand alignment.",
  },
];

const exampleQueries = [
  "What is Wallchain?",
  "Explain InfoFi",
  "How do Quacks work?",
  "What are Quack Heads NFTs?",
];

export function InlineQueryHistory({ getAuthHeaders, historyFilter = "all" }: { getAuthHeaders: () => Promise<Record<string, string>>; historyFilter?: "all" | "search" | "quack-check" | "tweet-audit" }) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [deletingSession, setDeletingSession] = useState<string | null>(null);
  const [feedbackByQuery, setFeedbackByQuery] = useState<Record<string, string>>({});

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      if (!headers['x-privy-token']) { setLoading(false); return; }
      const [sessResp, fbResp] = await Promise.all([
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-history?action=list-sessions`, { headers }),
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-history?action=list-feedback`, { headers }),
      ]);
      const sessData = await sessResp.json();
      if (sessResp.ok && sessData.sessions) setSessions(sessData.sessions);
      const fbData = await fbResp.json().catch(() => ({ feedback: [] }));
      if (fbData.feedback) {
        const map: Record<string, string> = {};
        for (const fb of fbData.feedback) {
          const key = fb.user_query?.trim().toLowerCase() || "";
          if (key) map[key] = fb.feedback_type;
        }
        setFeedbackByQuery(map);
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const handleDelete = async (sessionId: string) => {
    setDeletingSession(sessionId);
    try {
      const headers = await getAuthHeaders();
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-history?action=user-delete`, {
        method: "POST", headers, body: JSON.stringify({ sessionId }),
      });
      setSessions((prev) => prev.filter((s) => s.session_id !== sessionId));
    } catch (err) {
      console.error("Failed to delete session:", err);
    } finally {
      setDeletingSession(null);
    }
  };

  const getFeedbackForQuery = (userContent: string) => {
    const key = userContent?.trim().toLowerCase() || "";
    return feedbackByQuery[key] || null;
  };

  const getQAPairs = (messages: ChatMessage[]) => {
    const pairs: { user: ChatMessage; assistant: ChatMessage | null }[] = [];
    for (let i = 0; i < messages.length; i++) {
      if (messages[i].role === "user") {
        const next = messages[i + 1];
        pairs.push({ user: messages[i], assistant: next?.role === "assistant" ? next : null });
        if (next?.role === "assistant") i++;
      }
    }
    return pairs;
  };

  // Detect campaign from message content
  const detectCampaign = (preview: string): string | null => {
    const upper = (preview || "").toUpperCase();
    if (upper.includes("[WALLCHAIN]")) return "wallchain";
    if (upper.includes("[IDOS NETWORK]") || upper.includes("[IDOS]")) return "idos";
    if (upper.includes("[BEYOND]")) return "beyond";
    return null;
  };

  // Campaign color mapping
  const campaignBorderColor: Record<string, string> = {
    wallchain: "border-l-amber-400",
    idos: "border-l-emerald-400",
    beyond: "border-l-orange-400",
  };

  const campaignTextColor: Record<string, string> = {
    wallchain: "text-amber-400",
    idos: "text-emerald-400",
    beyond: "text-orange-400",
  };

  const campaignLabel: Record<string, string> = {
    wallchain: "Wallchain",
    idos: "idOS Network",
    beyond: "Beyond",
  };

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-4">
        <MessageSquare className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
        <p className="text-xs text-muted-foreground">No query history yet</p>
      </div>
    );
  }

  const filteredSessions = sessions.filter((session) => {
    if (historyFilter === "all") return true;
    const preview = (session.preview || "").toUpperCase();
    if (historyFilter === "search") return !preview.includes("[QUACK CHECK]") && !preview.includes("[TWEET AUDIT");
    if (historyFilter === "quack-check") return preview.includes("[QUACK CHECK]");
    if (historyFilter === "tweet-audit") return preview.includes("[TWEET AUDIT");
    return true;
  });
  if (filteredSessions.length === 0) {
    return (
      <div className="text-center py-4">
        <MessageSquare className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
        <p className="text-xs text-muted-foreground">No history for this mode</p>
      </div>
    );
  }

  return (
    <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
      {filteredSessions.map((session) => {
        const pairs = getQAPairs(session.messages);
        const isExpanded = expandedSession === session.session_id;
        const detectedCampaign = detectCampaign(session.preview);
        const borderClass = detectedCampaign ? campaignBorderColor[detectedCampaign] : "";
        const labelColor = detectedCampaign ? campaignTextColor[detectedCampaign] : "";
        const label = detectedCampaign ? campaignLabel[detectedCampaign] : "";
        return (
          <div key={session.session_id} className={`rounded-lg border border-border/50 bg-card/50 overflow-hidden ${borderClass ? `border-l-2 ${borderClass}` : ""}`}>
            <button
              className="w-full flex items-center gap-2 p-2.5 text-left hover:bg-muted/30 transition-colors"
              onClick={() => setExpandedSession(isExpanded ? null : session.session_id)}
            >
              <ChevronRight className={`w-3 h-3 text-muted-foreground shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {label && <span className={`text-[10px] font-semibold ${labelColor}`}>{label}</span>}
                  <p className="text-xs text-foreground truncate">{session.preview || "Chat session"}</p>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(session.created_at).toLocaleDateString()} • {pairs.length} {pairs.length === 1 ? "exchange" : "exchanges"}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={(e) => { e.stopPropagation(); handleDelete(session.session_id); }}
                disabled={deletingSession === session.session_id}
              >
                {deletingSession === session.session_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              </Button>
            </button>
            {isExpanded && (
              <div className="border-t border-border/30 bg-muted/10 max-h-52 overflow-y-auto p-2.5 space-y-2">
                {pairs.map((pair, i) => {
                  const fbType = getFeedbackForQuery(pair.user.content);
                  const pairCampaign = detectCampaign(pair.user.content);
                  const pairBorder = pairCampaign ? campaignBorderColor[pairCampaign] : "";
                  return (
                    <div key={i} className={`rounded-md bg-card/60 border border-border/30 p-2.5 space-y-1.5 ${pairBorder ? `border-l-2 ${pairBorder}` : ""}`}>
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
                      {fbType && (
                        <div className="flex items-center gap-1 pt-1 border-t border-border/20">
                          {fbType === "positive" ? <ThumbsUp className="w-3 h-3 text-green-500" /> : <ThumbsDown className="w-3 h-3 text-destructive" />}
                          <span className="text-[10px] text-muted-foreground">{fbType === "positive" ? "Liked" : "Disliked"}</span>
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
  );
}

export function WelcomeScreen({ tier, queriesRemaining, onQuerySelect, isAuthenticated, onLogin, getAuthHeaders }: WelcomeScreenProps) {
  return (
    <ScrollBendContainer className="flex-1 flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="animate-float mb-8">
        <QuackLogo size="xl" />
      </div>
      
      {/* Tagline */}
      <h1 className="text-2xl md:text-3xl font-display font-bold text-center mb-3">
        <span className="text-gradient">Wallchain & InfoFi</span>
        <br />
        <span className="text-foreground/80">Campaign Intelligence Engine</span>
      </h1>
      
      <p className="text-muted-foreground text-center max-w-md mb-8">
        Get verified information about Wallchain campaigns. 
        Ask questions, verify facts, & audit posts—no content creation, just solid, reliable information.
      </p>
      
      {/* User tier with pointing hand */}
      <div className="mb-8 flex items-center gap-2">
        <span className="text-2xl animate-point-down">👇</span>
        <TierBadge tier={tier} showLimits />
      </div>
      
      {/* Features grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mb-10">
        {features.map((feature) => (
          <div 
            key={feature.title}
            className="p-4 rounded-xl bg-card/50 border border-border/50 hover:border-primary/30 transition-colors"
          >
            <feature.icon className="w-6 h-6 text-primary mb-3" />
            <h3 className="font-medium text-foreground mb-1 text-center">{feature.title}</h3>
            <p className="text-sm text-muted-foreground">{feature.description}</p>
          </div>
        ))}
      </div>
      
      {/* Example queries or login */}
      {isAuthenticated ? (
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-3">Try asking:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {exampleQueries.map((query) => (
              <button
                key={query}
                onClick={() => onQuerySelect?.(query)}
                className="px-4 py-2 rounded-full bg-secondary/50 border border-border/50 text-sm text-foreground/80 hover:bg-secondary hover:border-primary/30 hover:text-foreground transition-all"
              >
                {query}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">Create a free account</p>
          <button 
            onClick={onLogin}
            className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
          >
            Sign in to Quack check
          </button>
        </div>
      )}
      
    </ScrollBendContainer>
  );
}