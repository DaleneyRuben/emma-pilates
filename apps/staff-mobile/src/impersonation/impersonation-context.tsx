import type { MobileImpersonation } from "@pilates/mobile-core";
import { createContext, useContext } from "react";

export type ImpersonationNotice =
  "Dejaste de ver la app como" | "Terminó el tiempo para ver la app como";

export type ImpersonationState = {
  /** Set while the Administrator sees the app as a Staff Member (FUT-001). */
  impersonation: MobileImpersonation | null;
  /** The transient line Pagos pendientes shows after an exit or an expiry. */
  notice: string | null;
  clearNotice: () => void;
  /** Resolves the session again after an Impersonation starts or ends. */
  refreshSession: () => Promise<void>;
};

const inactive: ImpersonationState = {
  impersonation: null,
  notice: null,
  clearNotice: () => undefined,
  refreshSession: () => Promise.resolve(),
};

export const ImpersonationContext = createContext<ImpersonationState>(inactive);

export function useImpersonation(): ImpersonationState {
  return useContext(ImpersonationContext);
}
