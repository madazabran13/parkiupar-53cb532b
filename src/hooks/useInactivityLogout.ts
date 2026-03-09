import { useEffect, useRef, useCallback } from 'react';

const INACTIVITY_TIMEOUT = 2 * 60 * 60 * 1000; // 2 hours in ms
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll', 'mousemove'];
const THROTTLE_MS = 60_000; // Only update last activity every 60s

export function useInactivityLogout(onTimeout: () => void, enabled: boolean) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef(Date.now());

  const resetTimer = useCallback(() => {
    const now = Date.now();
    // Throttle: only reset if enough time passed since last reset
    if (now - lastActivityRef.current < THROTTLE_MS) return;
    lastActivityRef.current = now;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onTimeout();
    }, INACTIVITY_TIMEOUT);
  }, [onTimeout]);

  useEffect(() => {
    if (!enabled) return;

    // Initial timer
    timerRef.current = setTimeout(onTimeout, INACTIVITY_TIMEOUT);

    const handler = () => resetTimer();
    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, handler, { passive: true })
    );

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((event) =>
        window.removeEventListener(event, handler)
      );
    };
  }, [enabled, onTimeout, resetTimer]);
}
