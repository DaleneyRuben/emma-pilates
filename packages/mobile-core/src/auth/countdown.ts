import { useEffect, useState } from "react";

// A server wait (Retry-After) reads as m:ss, as 01, 20, S01, and S06 draw it.
export function formatCountdown(seconds: number): string {
  const whole = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

/** Counts a server-provided wait down to zero, one second at a time. */
export function useCountdown(): [number, (seconds: number) => void] {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (remaining <= 0) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setRemaining((current) => Math.max(0, current - 1));
    }, 1_000);

    return () => clearTimeout(timer);
  }, [remaining]);

  return [remaining, (seconds) => setRemaining(Math.max(0, Math.floor(seconds)))];
}
