import { useEffect, useEffectEvent } from "react";

/**
 * A notice that a navigation carried in its params («Reserva confirmada»,
 * «Pago confirmado»): the screen shows it while the param is set, and `dismiss`
 * clears the param once `visibleMs` have passed, so the notice is never copied
 * into state and cannot outlive its param (MOB-052). `dismiss` is an effect
 * event: a new closure on every render does not restart the timer.
 */
export function useTransientNotice<T>(
  notice: T | undefined,
  visibleMs: number,
  dismiss: () => void,
): T | null {
  const expire = useEffectEvent(dismiss);

  useEffect(() => {
    if (notice === undefined) return undefined;
    const timer = setTimeout(() => expire(), visibleMs);
    return () => clearTimeout(timer);
  }, [notice, visibleMs]);

  return notice ?? null;
}
