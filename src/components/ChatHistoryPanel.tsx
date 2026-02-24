import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";

import { History, Trash2, X, Loader2, MessageSquare, ChevronRight, ThumbsUp, ThumbsDown } from "lucide-react";

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

interface ChatHistoryPanelProps {
  getAuthHeaders: () => Promise<Record<string, string>>;
  onLoadSession?: (messages: { role: string; content: string }[]) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function ChatHistoryPanel({ getAuthHeaders, onLoadSession, isOpen, onClose }: ChatHistoryPanelProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [deletingSession, setDeletingSession] = useState<string | null>(null);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, { type: string; query: string }>>({});

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
        const map: Record<string, { type: string; query: string }> = {};
        for (const fb of fbData.feedback) {
          // Key by the AI response content (first 100 chars) for matching
          const key = fb.message_content?.substring(0, 100) || "";
          if (key) map[key] = { type: fb.feedback_type, query: fb.user_query || "" };
        }
        setFeedbackMap(map);
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    if (isOpen) fetchSessions();
  }, [isOpen, fetchSessions]);

  const handleDelete = async (sessionId: string) => {
    setDeletingSession(sessionId);
    try {
      const headers = await getAuthHeaders();
      if (!headers['x-privy-token']) { setDeletingSession(null); return; }
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-history?action=user-delete`,
        { method: "POST", headers, body: JSON.stringify({ sessionId }) }
      );
      setSessions((prev) => prev.filter((s) => s.session_id !== sessionId));
    } catch (err) {
      console.error("Failed to delete session:", err);
    } finally {
      setDeletingSession(null);
    }
  };

  // Find feedback for an assistant message
  const getFeedbackForMessage = (content: string) => {
    const key = content?.substring(0, 100) || "";
    return feedbackMap[key] || null;
  };

  // Group messages into Q&A pairs
  const getQAPairs = (messages: ChatMessage[]) => {
    const pairs: { user: ChatMessage; assistant: ChatMessage | null }[] = [];
    for (let i = 0; i < messages.length; i++) {
      if (messages[i].role === "user") {
        const next = messages[i + 1];
        pairs.push({
          user: messages[i],
          assistant: next?.role === "assistant" ? next : null,
        });
        if (next?.role === "assistant") i++;
      }
    }
    return pairs;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 left-0 z-50 w-96 bg-card border-r border-border shadow-xl flex flex-col animate-in slide-in-from-left-full duration-200">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Chat History</h2>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 px-4">
            <MessageSquare className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No chat history yet</p>
          </div>
        ) : (
          <div className="p-3 space-y-3">
            {sessions.map((session) => {
              const pairs = getQAPairs(session.messages);
              const isExpanded = expandedSession === session.session_id;
              return (
                <div key={session.session_id} className="rounded-lg border border-border/50 bg-card/50 overflow-hidden">
                  <button
                    className="w-full flex items-center gap-2 p-3 text-left hover:bg-muted/30 transition-colors"
                    onClick={() => setExpandedSession(isExpanded ? null : session.session_id)}
                  >
                    <ChevronRight
                      className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground truncate">{session.preview || "Chat session"}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(session.created_at).toLocaleDateString()} •{" "}
                        {pairs.length} {pairs.length === 1 ? "exchange" : "exchanges"}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(session.session_id);
                      }}
                      disabled={deletingSession === session.session_id}
                    >
                      {deletingSession === session.session_id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                    </Button>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border/30 bg-muted/10">
                      <div className="max-h-80 overflow-y-auto p-3 space-y-3">
                        {pairs.map((pair, i) => {
                          const feedback = pair.assistant ? getFeedbackForMessage(pair.assistant.content) : null;
                          return (
                            <div key={i} className="rounded-md bg-card/60 border border-border/30 p-3 space-y-2">
                              {/* User query */}
                              <div className="text-xs">
                                <span className="font-semibold text-primary">You:</span>{" "}
                                <span className="text-foreground/90">{pair.user.content}</span>
                              </div>
                              {/* Assistant response */}
                              {pair.assistant && (
                                <div className="text-xs">
                                  <span className="font-semibold text-muted-foreground">quackGPT:</span>{" "}
                                  <span className="text-foreground/70">{pair.assistant.content}</span>
                                </div>
                              )}
                              {/* Feedback indicator */}
                              {feedback && (
                                <div className="flex items-center gap-1 pt-1 border-t border-border/20">
                                  {feedback.type === "positive" ? (
                                    <ThumbsUp className="w-3 h-3 text-green-500" />
                                  ) : (
                                    <ThumbsDown className="w-3 h-3 text-destructive" />
                                  )}
                                  <span className="text-[10px] text-muted-foreground">
                                    {feedback.type === "positive" ? "Liked" : "Disliked"}
                                  </span>
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
        )}
      </div>
    </div>
  );
}
