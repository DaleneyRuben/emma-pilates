import { useMountedAt } from "@pilates/mobile-core";
import { useEffect, useState } from "react";

// setTimeout holds at most about 24 days; a later start re-arms on the next mount.
const longestDelay = 2_147_000_000;

/**
 * Whether `startsAt` has passed, turning true by itself when it does, so a
 * screen left open before a class (the roster) reacts at the start. The clock
 * is read when the screen mounts; after that only the timer says it started.
 */
export function useHasStarted(startsAt: string | undefined): boolean {
  const mountedAt = useMountedAt();
  const [reached, setReached] = useState<string | null>(null);
  const start = startsAt === undefined ? null : new Date(startsAt).getTime();
  const startedAtMount = start !== null && start <= mountedAt;

  useEffect(() => {
    if (startsAt === undefined || startedAtMount) return undefined;
    const delay = Math.max(0, new Date(startsAt).getTime() - Date.now());
    const timer = setTimeout(() => setReached(startsAt), Math.min(delay, longestDelay));
    return () => clearTimeout(timer);
  }, [startsAt, startedAtMount]);

  return startedAtMount || (startsAt !== undefined && reached === startsAt);
}
