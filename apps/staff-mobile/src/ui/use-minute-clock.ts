import { useEffect, useState } from "react";

const tick = 30_000;

/**
 * The time now, read again every half minute so a screen left open (the
 * roster's «Empieza en N min») keeps counting down by itself.
 */
export function useMinuteClock(): Date {
  const [now, setNow] = useState(() => new Date(Date.now()));
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date(Date.now())), tick);
    return () => clearInterval(timer);
  }, []);
  return now;
}
