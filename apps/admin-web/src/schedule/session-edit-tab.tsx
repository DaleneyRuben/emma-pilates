import type { AdministratorSessionAvailabilityDto } from "@pilates/api-contracts";
import { useState } from "react";
import { CancelSessionAction } from "./cancel-session-action";
import { OccurrenceForm } from "./occurrence-form";

// FIX-091 (W1, Editar clase A): the Editar tab changes only this class
// («Solo esta clase», follow-up 39) and keeps its cancellation under the
// save. A class of a weekly series points to the Serie semanal tab for the
// rest of the series.
export function SessionEditTab({
  session,
  branchId,
  onDone,
}: {
  session: AdministratorSessionAvailabilityDto;
  branchId: string;
  onDone: (notice: string | null) => void;
}) {
  const [failure, setFailure] = useState<string | null>(null);

  return (
    <div className="flex flex-1 flex-col">
      {session.sessionScheduleId === null ? null : (
        <p className="px-7 pt-4 text-nota text-texto">
          Cambia solo esta clase. Para cambiar la serie, usa Serie semanal.
        </p>
      )}
      <OccurrenceForm
        session={session}
        branchId={branchId}
        failure={failure}
        onFailure={setFailure}
        onDone={onDone}
        footer={
          <CancelSessionAction
            session={session}
            branchId={branchId}
            onDone={onDone}
            onFailure={setFailure}
          />
        }
      />
    </div>
  );
}
