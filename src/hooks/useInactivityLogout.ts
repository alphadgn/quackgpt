import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const WARNING_BEFORE_MS = 10 * 1000; // 10 seconds warning

export function useInactivityLogout(isAuthenticated: boolean, logout: () => void) {
  const mainTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const warningFiredRef = useRef(false);
  // Store logout in a ref so timer callbacks always use the latest without causing re-renders
  const logoutRef = useRef(logout);
  logoutRef.current = logout;
  const authRef = useRef(isAuthenticated);
  authRef.current = isAuthenticated;

  useEffect(() => {
    if (!isAuthenticated) {
      // Clear all timers when not authenticated
      if (mainTimerRef.current) clearTimeout(mainTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      warningFiredRef.current = false;
      return;
    }

    function clearAllTimers() {
      if (mainTimerRef.current) clearTimeout(mainTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      warningFiredRef.current = false;
    }

    function resetTimer() {
      clearAllTimers();
      if (!authRef.current) return;

      // Warning fires 10s before logout
      warningTimerRef.current = setTimeout(() => {
        warningFiredRef.current = true;
        let secondsLeft = 10;
        const toastId = 'inactivity-warning';
        toast.warning(`Signing out in ${secondsLeft}s due to inactivity…`, {
          id: toastId,
          duration: WARNING_BEFORE_MS + 1000,
        });
        countdownRef.current = setInterval(() => {
          secondsLeft -= 1;
          if (secondsLeft > 0) {
            toast.warning(`Signing out in ${secondsLeft}s due to inactivity…`, {
              id: toastId,
              duration: WARNING_BEFORE_MS + 1000,
            });
          }
        }, 1000);
      }, INACTIVITY_TIMEOUT_MS - WARNING_BEFORE_MS);

      // Actual logout
      mainTimerRef.current = setTimeout(() => {
        clearAllTimers();
        toast.dismiss('inactivity-warning');
        logoutRef.current();
      }, INACTIVITY_TIMEOUT_MS);
    }

    const events = ['mousemove', 'keydown', 'touchstart', 'click'] as const;
    const handler = () => {
      if (warningFiredRef.current) {
        toast.dismiss('inactivity-warning');
      }
      resetTimer();
    };
    events.forEach(e => window.addEventListener(e, handler, { passive: true }));
    resetTimer();

    return () => {
      clearAllTimers();
      events.forEach(e => window.removeEventListener(e, handler));
    };
  }, [isAuthenticated]); // Only re-run when auth state changes
}
