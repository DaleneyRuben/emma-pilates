import type { AdministratorSessionAvailabilityDto } from "@pilates/api-contracts";
import { SidePanel } from "../components/panel/side-panel";
import type { Branch } from "../shell/branch/branch-context";
import { formatSessionMoment } from "../lib/bolivia-time";
import { SessionCreateForm, type SessionStart } from "./session-create-form";
import { SessionEditForm } from "./session-edit-form";

export type SessionPanelState =
  | { mode: "closed" }
  | { mode: "create"; start?: SessionStart }
  | { mode: "edit"; session: AdministratorSessionAvailabilityDto };

// AW03: "8 de 10 lugares reservados · 3 en lista de espera" (invariant 4).
const occupancyLine = (session: AdministratorSessionAvailabilityDto) =>
  [
    formatSessionMoment(session.startsAt),
    `${session.bookedCount} de ${session.capacity} lugares reservados`,
    ...(session.waitlistCount > 0
      ? [`${session.waitlistCount} en lista de espera`]
      : []),
  ].join(" · ");

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
  onDone: (notice: string | null) => void;
}) {
  const description =
    state.mode === "edit"
      ? occupancyLine(state.session)
      : `Sucursal ${branch.name} · sala única`;

  return (
    <SidePanel
      open={state.mode !== "closed"}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={state.mode === "edit" ? "Editar sesión" : "Nueva sesión"}
      description={description}
    >
      {state.mode === "create" ? (
        <SessionCreateForm
          key={state.start ? `${state.start.date} ${state.start.time}` : "new"}
          branchId={branch.id}
          start={state.start}
          onDone={onDone}
        />
      ) : null}
      {state.mode === "edit" ? (
        <SessionEditForm
          key={state.session.id}
          session={state.session}
          branchId={branch.id}
          onDone={onDone}
        />
      ) : null}
    </SidePanel>
  );
}
