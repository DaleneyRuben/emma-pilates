import type { AdministratorSessionAvailabilityDto } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChoiceChips } from "../components/form/choice-chips";
import { LoadingNotice } from "../components/page/query-failure";
import { CancelSessionAction } from "./cancel-session-action";
import { OccurrenceForm } from "./occurrence-form";
import { branchSchedulesQueryOptions } from "./schedule-queries";
import { SeriesForm } from "./series-form";

type Scope = "only" | "future";

// AW03 edit mode. A Session a weekly schedule generated asks whether the
// change is for "Solo esta sesión" or "Esta y las futuras" (follow-up 39);
// a one-off Session has only itself. Cancellation stays an occurrence
// action in both.
export function SessionEditForm({
  session,
  branchId,
  onDone,
}: {
  session: AdministratorSessionAvailabilityDto;
  branchId: string;
  onDone: (notice: string | null) => void;
}) {
  const [scope, setScope] = useState<Scope>("only");
  const [failure, setFailure] = useState<string | null>(null);
  const schedules = useQuery({
    ...branchSchedulesQueryOptions(branchId),
    enabled: session.sessionScheduleId !== null,
  });
  const schedule = schedules.data?.find(
    (candidate) => candidate.id === session.sessionScheduleId,
  );

  const cancel = (
    <CancelSessionAction
      session={session}
      branchId={branchId}
      onDone={onDone}
      onFailure={setFailure}
    />
  );

  return (
    <div className="flex flex-1 flex-col">
      {session.sessionScheduleId === null ? null : (
        <div className="px-5 pt-2">
          <ChoiceChips
            legend="Aplicar el cambio a"
            name="scope"
            value={scope}
            options={[
              ["only", "Solo esta sesión"],
              ["future", "Esta y las futuras"],
            ]}
            onChange={(next) => {
              setFailure(null);
              setScope(next);
            }}
          />
        </div>
      )}
      {scope === "only" ? (
        <OccurrenceForm
          session={session}
          branchId={branchId}
          failure={failure}
          onFailure={setFailure}
          onDone={onDone}
          footer={cancel}
        />
      ) : schedule !== undefined ? (
        <SeriesForm
          session={session}
          schedule={schedule}
          branchId={branchId}
          failure={failure}
          onFailure={setFailure}
          onDone={onDone}
          footer={cancel}
        />
      ) : schedules.isPending ? (
        <div className="px-5 py-4">
          <LoadingNotice>Cargando la serie semanal…</LoadingNotice>
        </div>
      ) : (
        <p role="alert" className="px-5 py-4 text-nota text-error-texto">
          Esta serie semanal ya no está vigente. Cambia solo esta sesión.
        </p>
      )}
    </div>
  );
}
