import { useState, useEffect } from 'react';

function getNextResetTime(): number {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  return next.getTime();
}

function formatTime(ms: number): string {
  if (ms <= 0) return '00h 00m';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
}

export function CountdownTimer() {
  const [remaining, setRemaining] = useState(() => getNextResetTime() - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = getNextResetTime() - Date.now();
      setRemaining(diff <= 0 ? 0 : diff);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-40 px-3 py-1.5 rounded-lg bg-card/80 backdrop-blur border border-border/50 shadow-sm">
      <span className="text-[11px] text-muted-foreground font-mono">
        Reset in: {formatTime(remaining)}
      </span>
    </div>
  );
}
