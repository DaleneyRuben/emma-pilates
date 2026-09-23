import { useCallback, useSyncExternalStore } from "react";

// Below the lg breakpoint the sidebar collapses into a drawer and popovers
// become bottom sheets (design system → Admin Desktop Web Responsiveness).
export const narrowViewportQuery = "(max-width: 1023px)";

const canMatch = (): boolean => typeof window.matchMedia === "function";

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!canMatch()) return () => undefined;
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => (canMatch() ? window.matchMedia(query).matches : false),
    () => false,
  );
}

export const useIsNarrowViewport = (): boolean =>
  useMediaQuery(narrowViewportQuery);
