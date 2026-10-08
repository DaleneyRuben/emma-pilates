import { useCallback, useEffect, useEffectEvent, useState } from "react";

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

  // Restoring happens once per launch, whatever the props do later: the effect
  // runs once and reads the props through an effect event, so a later render
  // (a new `onRestored` closure, a link that flips `restore`) neither restarts
  // the load nor discards its result.
  const restoreProps = useEffectEvent(() =>
    store === undefined || !restore ? null : { onRestored, store },
  );

  useEffect(() => {
    const props = restoreProps();
    if (props === null) return undefined;
    let mounted = true;
    void props.store.load().then(async (kept) => {
      if (!mounted) return;
      if (kept !== null) {
        if (Date.now() >= kept.pendingExpiresAt) await props.store.clear();
        setPendingState(kept);
        props.onRestored();
      }
      setRestoring(false);
    });
    return () => {
      mounted = false;
    };
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
