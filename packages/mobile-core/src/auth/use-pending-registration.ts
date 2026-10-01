import { useCallback, useEffect, useState } from "react";

import type { PendingRegistration } from "./pending-registration-screens";
import type { PendingRegistrationStore } from "./pending-registration-store";

/**
 * The pending registration, written through to `store` when there is one.
 * At launch it restores what an earlier launch kept; a lapsed one is shown
 * once («El registro venció») and already forgotten.
 */
export function usePendingRegistration({
  onRestored,
  restore,
  store,
}: {
  onRestored: () => void;
  /** False when a link opened the app: its own screen comes first. */
  restore: boolean;
  store?: PendingRegistrationStore;
}) {
  const [pending, setPendingState] = useState<PendingRegistration | null>(null);
  const [restoring, setRestoring] = useState(store !== undefined && restore);

  useEffect(() => {
    if (store === undefined || !restore) return undefined;
    let active = true;
    void store.load().then(async (kept) => {
      if (!active) return;
      if (kept !== null) {
        if (Date.now() >= kept.pendingExpiresAt) await store.clear();
        setPendingState(kept);
        onRestored();
      }
      setRestoring(false);
    });
    return () => {
      active = false;
    };
    // Restoring happens once per launch, whatever the props do later.
  }, []);

  const setPending = useCallback(
    (next: PendingRegistration | null) => {
      setPendingState(next);
      if (store !== undefined) {
        void (next === null ? store.clear() : store.save(next));
      }
    },
    [store],
  );

  return { pending, restoring, setPending };
}
