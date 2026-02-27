import { useEffect, useCallback, useRef } from 'react';

const INACTIVITY_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes

// Also scroll to top when inactivity logout fires

export function useInactivityLogout(isAuthenticated: boolean, logout: () => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!isAuthenticated) return;
    timerRef.current = setTimeout(() => {
      logout();
      // Multiple scroll attempts to ensure it fires after auth state settles
      const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      scrollToTop();
      setTimeout(scrollToTop, 100);
      setTimeout(scrollToTop, 300);
      setTimeout(scrollToTop, 600);
    }, INACTIVITY_TIMEOUT_MS);
  }, [isAuthenticated, logout]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const events = ['mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [isAuthenticated, resetTimer]);
}
