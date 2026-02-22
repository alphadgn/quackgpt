import { useState, useEffect } from 'react';

function formatTime(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
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
    }, 1000);
    return () => clearInterval(interval);
  }, [resetTime]);

  if (!resetTime || remaining <= 0) return null;

  return (
    <div className="w-full py-1 rounded-md bg-destructive/10 border border-destructive/20 text-center">
      <span className="text-[10px] text-destructive font-mono tracking-wider">
        {formatTime(remaining)}
      </span>
    </div>
  );
}
