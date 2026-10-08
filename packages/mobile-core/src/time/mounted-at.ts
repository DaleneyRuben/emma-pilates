import { useState } from "react";

/**
 * The instant the component first rendered, in epoch milliseconds. A screen
 * that compares a deadline with «now» reads the clock once here instead of on
 * every render, so render stays pure (React Compiler `purity`, MOB-052); the
 * server's own flags carry the live truth, and a remount reads it again.
 */
export function useMountedAt(): number {
  const [mountedAt] = useState(() => Date.now());
  return mountedAt;
}
