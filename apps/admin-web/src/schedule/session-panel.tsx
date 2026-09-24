import type { AdministratorSessionAvailabilityDto } from "@pilates/api-contracts";
import { SidePanel } from "../components/panel/side-panel";
import type { Branch } from "../shell/branch/branch-context";
import { SessionCreateForm } from "./session-create-form";

export type SessionPanelState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; session: AdministratorSessionAvailabilityDto };

// AW03: the side panel over the week, so the Administrator keeps their place.
export function SessionPanel({
  state,
  branch,
  onClose,
  onDone,
}: {
  state: SessionPanelState;
  branch: Branch;
  onClose: () => void;
  onDone: (notice: string) => void;
}) {
  return (
    <SidePanel
      open={state.mode !== "closed"}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={state.mode === "edit" ? "Editar sesión" : "Nueva sesión"}
      description={`Sucursal ${branch.name} · sala única`}
    >
      {state.mode === "create" ? (
        <SessionCreateForm branchId={branch.id} onDone={onDone} />
      ) : null}
    </SidePanel>
  );
}
