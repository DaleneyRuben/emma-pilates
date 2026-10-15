import { useCallback, useLayoutEffect, useMemo, useRef } from "react";

// A tap that launched the app arrives before the navigator can route it, so
// the latest one waits for the navigator's onReady (ADR-0036).
export function usePendingUntilReady<Item>(open: (item: Item) => void) {
  const openRef = useRef(open);
  const ready = useRef(false);
  const pending = useRef<{ item: Item } | null>(null);
  useLayoutEffect(() => {
    openRef.current = open;
  });

  const deliver = useCallback((item: Item) => {
    if (ready.current) {
      openRef.current(item);
    } else {
      pending.current = { item };
    }
  }, []);

  const onReady = useCallback(() => {
    ready.current = true;
    const waiting = pending.current;
    pending.current = null;
    if (waiting !== null) openRef.current(waiting.item);
  }, []);

  return useMemo(() => ({ deliver, onReady }), [deliver, onReady]);
}
