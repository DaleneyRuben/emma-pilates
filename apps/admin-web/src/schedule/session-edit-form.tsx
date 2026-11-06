import type { AdministratorSessionAvailabilityDto } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChoiceChips } from "../components/form/choice-chips";
import { LoadingNotice } from "../components/page/query-failure";
import { CancelSessionAction } from "./cancel-session-action";
import { OccurrenceForm } from "./occurrence-form";
import { branchSchedulesQueryOptions } from "./schedule-queries";
import { SeriesForm } from "./series-form";
import { SeriesPauseNotice, SeriesRow } from "./series-row";

type Scope = "only" | "future";

// AW03 edit mode. A Session a weekly schedule generated asks whether the
// change is for "Solo esta sesión" or "Esta y las futuras" (follow-up 39),
// titled «Aplicar cambios a» right above the fields it scopes; a one-off
// Session has only itself. Cancellation stays an occurrence action in both,
// and the series' own actions sit in a row below (FIX-042, proposal A).
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
      {schedule === undefined ? null : (
        <div className="px-7 pt-2">
          <SeriesPauseNotice schedule={schedule} />
        </div>
      )}
      {session.sessionScheduleId === null ? null : (
        <div className="mx-7 mt-2 border-t border-divisor pt-4">
          <ChoiceChips
            legend="Aplicar cambios a"
            showLegend
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
      {schedule === undefined ? null : (
        <SeriesRow
          session={session}
          schedule={schedule}
          branchId={branchId}
          onDone={onDone}
          onFailure={setFailure}
        />
      )}
    </div>
  );
}
