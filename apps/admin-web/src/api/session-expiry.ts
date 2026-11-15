import { isApiError } from "./problem";

export type SessionExpiry = {
  /** Called by the QueryClient for every failed query or mutation. */
  report(error: unknown, meta?: Record<string, unknown>): void;
  /** A new session started: the next expiry is reported again. */
  reset(): void;
  /** The Administrator logged out: late failures are not an expiry. */
  silence(): void;
};

/**
 * Many requests can discover a revoked or idle-expired session at once;
 * only the first `authentication_required` sends the Administrator back to
 * Login. The startup probe owns its own redirect, and a rejected Login
 * (`authentication_failed`) is an answer, not an expiry. With `isSignedIn`,
 * the backend confirms first (FIX-058): a 401 from one endpoint while the
 * session lives is that request's failure, shown where it happened.
 */
export function createSessionExpiry(
  onExpired: () => void,
  options: { isSignedIn?: () => Promise<boolean> } = {},
): SessionExpiry {
  let reported = false;
  // reset() and silence() start a new generation: a probe sent before them
  // answers for a session that no longer matters, so its answer is dropped.
  let generation = 0;

  return {
    report(error, meta) {
      if (
        reported ||
        meta?.sessionProbe === true ||
        !isApiError(error) ||
        error.code !== "authentication_required"
      ) {
        return;
      }
      reported = true;
      if (options.isSignedIn === undefined) {
        onExpired();
        return;
      }
      const asked = generation;
      void options.isSignedIn().then(
        (signedIn) => {
          if (asked !== generation) return;
          if (signedIn) reported = false;
          else onExpired();
        },
        () => {
          if (asked === generation) reported = false;
        },
      );
    },
    reset() {
      generation += 1;
      reported = false;
    },
    silence() {
      generation += 1;
      reported = true;
    },
  };
}
