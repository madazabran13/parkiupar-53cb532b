import { useEffect, useState } from 'react';

export interface CountdownState {
  expired: boolean;
  label: string;
  minutes: number;
  seconds: number;
}

export function useCountdown(expiresAt: string | null | undefined, active: boolean): CountdownState {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active]);

  if (!expiresAt) {
    return { expired: true, label: '00:00', minutes: 0, seconds: 0 };
  }

  const remainingMs = new Date(expiresAt).getTime() - now;
  const expired = remainingMs <= 0;
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return {
    expired,
    label: `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
    minutes,
    seconds,
  };
}
