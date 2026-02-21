import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Trash2, X, Loader2, MessageSquare, ChevronRight } from "lucide-react";

interface ChatSession {
  session_id: string;
  created_at: string;
  preview: string;
  messages: { role: string; content: string; created_at: string }[];
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

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-history?action=list-sessions`,
        { headers }
      );
      const data = await resp.json();
      if (resp.ok && data.sessions) setSessions(data.sessions);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 left-0 z-50 w-80 bg-card border-r border-border shadow-xl flex flex-col animate-in slide-in-from-left-full duration-200">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Chat History</h2>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
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
          <div className="p-2 space-y-1">
            {sessions.map((session) => (
              <div key={session.session_id} className="rounded-lg border border-border/50 bg-card/50 overflow-hidden">
                <button
                  className="w-full flex items-center gap-2 p-3 text-left hover:bg-muted/30 transition-colors"
                  onClick={() =>
                    setExpandedSession(
                      expandedSession === session.session_id ? null : session.session_id
                    )
                  }
                >
                  <ChevronRight
                    className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform ${
                      expandedSession === session.session_id ? "rotate-90" : ""
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground truncate">{session.preview || "Chat session"}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(session.created_at).toLocaleDateString()} •{" "}
                      {session.messages.length} messages
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

                {expandedSession === session.session_id && (
                  <div className="border-t border-border/30 p-3 space-y-2 bg-muted/10 max-h-60 overflow-y-auto">
                    {session.messages.map((msg, i) => (
                      <div key={i} className={`text-xs ${msg.role === "user" ? "text-primary" : "text-foreground/80"}`}>
                        <span className="font-medium">{msg.role === "user" ? "You" : "quackGPT"}:</span>{" "}
                        <span className="line-clamp-3">{msg.content}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
