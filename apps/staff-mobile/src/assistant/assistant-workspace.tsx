import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { useIsTablet } from "../ui/use-is-tablet";
import type { ConfirmedBooking } from "./assistant-session-detail-screen";

// On tablets the Client Overview, her Bookings, and her history live in a
// detail panel beside Client Search instead of being pushed as screens.
export type ClientPanel =
  | { view: "overview"; clientId: string; reopened?: boolean }
  | {
      view: "bookings";
      clientId: string;
      clientName: string;
      confirmed?: ConfirmedBooking;
    }
  | { view: "history"; clientId: string; clientName: string };

type AssistantWorkspace = {
  /** Counts every `show`, so reopening the same Client remounts her panel. */
  opened: number;
  panel: ClientPanel | null;
  show: (panel: ClientPanel | null) => void;
  split: boolean;
};

const WorkspaceContext = createContext<AssistantWorkspace>({
  opened: 0,
  panel: null,
  show: () => undefined,
  split: false,
});

export function AssistantWorkspaceProvider({ children }: { children: ReactNode }) {
  const split = useIsTablet();
  const [{ opened, panel }, setPanel] = useState<{
    opened: number;
    panel: ClientPanel | null;
  }>({ opened: 0, panel: null });
  const show = useCallback(
    (next: ClientPanel | null) =>
      setPanel((current) => ({ opened: current.opened + 1, panel: next })),
    [],
  );
  const value = useMemo(() => ({ opened, panel, show, split }), [opened, panel, show, split]);
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useAssistantWorkspace(): AssistantWorkspace {
  return useContext(WorkspaceContext);
}

const InPanelContext = createContext(false);

export const InClientPanel = InPanelContext.Provider;

export function useInClientPanel(): boolean {
  return useContext(InPanelContext);
}
