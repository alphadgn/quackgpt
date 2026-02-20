import { useState, useEffect } from 'react';

function formatTime(ms: number): string {
  if (ms <= 0) return '00h 00m';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
}

interface CountdownTimerProps {
  resetTime: number | null;
}

export function CountdownTimer({ resetTime }: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(() => 
    resetTime ? Math.max(0, resetTime - Date.now()) : 0
  );

  useEffect(() => {
    if (!resetTime) {
      setRemaining(0);
      return;
    }
    setRemaining(Math.max(0, resetTime - Date.now()));
    const interval = setInterval(() => {
      const diff = resetTime - Date.now();
      setRemaining(diff <= 0 ? 0 : diff);
    }, 30000);
    return () => clearInterval(interval);
  }, [resetTime]);

  if (!resetTime || remaining <= 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 px-3 py-1.5 rounded-lg bg-card/80 backdrop-blur border border-border/50 shadow-sm">
      <span className="text-[11px] text-muted-foreground font-mono">
        Reset in: {formatTime(remaining)}
      </span>
    </div>
  );
}
