import { useCallback, useEffect, useState } from "react";

/**
 * Counts down a server-provided wait (`Retry-After`) one second at a time.
 * The client never computes a throttling delay itself (follow-up 37).
 */
export function useCountdown(): [number, (seconds: number) => void] {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (remaining <= 0) return undefined;
    const timer = window.setTimeout(() => setRemaining(remaining - 1), 1_000);
    return () => window.clearTimeout(timer);
  }, [remaining]);

  const start = useCallback((seconds: number) => {
    setRemaining(Math.max(0, Math.ceil(seconds)));
  }, []);

  return [remaining, start];
}

export const formatWait = (seconds: number): string =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
