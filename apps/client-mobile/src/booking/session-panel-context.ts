import { createContext, useContext } from "react";

const InSessionPanelContext = createContext(false);

/** Marks the class detail drawn in Reservar's tablet panel (03T) rather than pushed. */
export const InSessionPanel = InSessionPanelContext.Provider;

export function useInSessionPanel(): boolean {
  return useContext(InSessionPanelContext);
}
