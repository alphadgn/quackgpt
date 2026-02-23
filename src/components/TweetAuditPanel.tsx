import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bird, Loader2, AlertTriangle, CheckCircle, XCircle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface TweetAuditResult {
  composite_score: number;
  relevancy_score: number;
  honesty_score: number;
  correctness_score: number;
  brand_alignment_score: number;
  summary: string;
  claim_analysis: Array<{ claim: string; verdict: string; explanation: string }>;
  suggested_improvements: string[];
  risk_flags: string[];
}

interface TweetAuditPanelProps {
  getAuthHeaders: () => Promise<Record<string, string>>;
  onQueryUsed?: () => void;
}

function ScoreBar({ label, score, weight }: { label: string; score: number; weight: string }) {
  const color = score >= 75 ? "bg-green-500" : score >= 50 ? "bg-yellow-500" : "bg-destructive";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label} <span className="text-muted-foreground/50">({weight})</span></span>
        <span className="font-mono font-semibold text-foreground">{score}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-700", color)} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function VerdictIcon({ verdict }: { verdict: string }) {
  switch (verdict) {
    case "TRUE": return <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />;
    case "FALSE": return <XCircle className="w-3.5 h-3.5 text-destructive shrink-0" />;
    case "PARTIALLY_TRUE": return <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 shrink-0" />;
    default: return <HelpCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />;
  }
}

export function TweetAuditPanel({ getAuthHeaders, onQueryUsed }: TweetAuditPanelProps) {
  const [tweetText, setTweetText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TweetAuditResult | null>(null);

  const handleAudit = async () => {
    if (!tweetText.trim() || tweetText.trim().length < 5) {
      toast.error("Tweet must be at least 5 characters");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const headers = await getAuthHeaders();

      // First scrape context
      let context = "";
      try {
        const scrapeResp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scrape-sources`, {
          method: "POST",
          headers,
          body: JSON.stringify({ query: tweetText }),
        });
        if (scrapeResp.ok) {
          const scrapeData = await scrapeResp.json();
          if (scrapeData.success) context = scrapeData.context || "";
        }
      } catch { /* skip */ }

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tweet-audit`, {
        method: "POST",
        headers,
        body: JSON.stringify({ tweetText: tweetText.trim(), context }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Audit failed");
      }

      const data = await resp.json();
      setResult(data);
      onQueryUsed?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Audit failed");
    } finally {
      setLoading(false);
    }
  };

  const compositeColor = result
    ? result.composite_score >= 75 ? "text-green-500" : result.composite_score >= 50 ? "text-yellow-500" : "text-destructive"
    : "";

  return (
    <div className="space-y-4">
      <div className="relative">
        <textarea
          value={tweetText}
          onChange={(e) => setTweetText(e.target.value)}
          placeholder="Paste your tweet draft here for ecosystem alignment scoring..."
          rows={4}
          maxLength={1000}
          className="w-full bg-secondary/30 border border-border/50 rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none focus:border-primary/50 transition-colors"
        />
        <span className="absolute bottom-2 right-3 text-[10px] text-muted-foreground">{tweetText.length}/1000</span>
      </div>

      <Button
        onClick={handleAudit}
        disabled={loading || tweetText.trim().length < 5}
        className="w-full gap-2"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bird className="w-4 h-4" />}
        {loading ? "Auditing..." : "🦆 Audit Tweet"}
      </Button>

      {result && (
        <div className="space-y-4 animate-slide-up">
          {/* Composite Score */}
          <div className="text-center p-4 rounded-xl bg-card/50 border border-border/50">
            <p className="text-xs text-muted-foreground mb-1">🦆 Tweet Integrity Score</p>
            <p className={cn("text-4xl font-bold font-mono", compositeColor)}>
              {result.composite_score}<span className="text-lg text-muted-foreground">/100</span>
            </p>
            <p className="text-sm text-muted-foreground mt-2">{result.summary}</p>
          </div>

          {/* Score Breakdown */}
          <div className="p-4 rounded-xl bg-card/50 border border-border/50 space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Score Breakdown</h4>
            <ScoreBar label="Relevancy" score={result.relevancy_score} weight="25%" />
            <ScoreBar label="Correctness" score={result.correctness_score} weight="30%" />
            <ScoreBar label="Honesty" score={result.honesty_score} weight="25%" />
            <ScoreBar label="Brand Alignment" score={result.brand_alignment_score} weight="20%" />
          </div>

          {/* Claim Analysis */}
          {result.claim_analysis.length > 0 && (
            <div className="p-4 rounded-xl bg-card/50 border border-border/50 space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Claim Analysis</h4>
              {result.claim_analysis.map((claim, i) => (
                <div key={i} className="flex gap-2 p-2 rounded-lg bg-muted/20 text-xs">
                  <VerdictIcon verdict={claim.verdict} />
                  <div>
                    <p className="font-medium text-foreground">"{claim.claim}"</p>
                    <p className="text-muted-foreground mt-0.5">{claim.explanation}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Risk Flags */}
          {result.risk_flags.length > 0 && (
            <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/20 space-y-1">
              <h4 className="text-xs font-semibold text-destructive uppercase tracking-wider text-center">⚠️ Risk Flags</h4>
              {result.risk_flags.map((flag, i) => (
                <p key={i} className="text-xs text-destructive/80">• {flag}</p>
              ))}
            </div>
          )}

          {/* Improvements */}
          {result.suggested_improvements.length > 0 && (
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-1">
              <h4 className="text-xs font-semibold text-primary uppercase tracking-wider text-center">💡 Suggested Improvements</h4>
              {result.suggested_improvements.map((imp, i) => (
                <p key={i} className="text-xs text-foreground/70">• {imp}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
