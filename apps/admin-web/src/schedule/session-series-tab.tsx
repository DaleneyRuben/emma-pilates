import type { AdministratorSessionAvailabilityDto } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { LoadingNotice } from "../components/page/query-failure";
import { branchSchedulesQueryOptions } from "./schedule-queries";
import { SeriesForm } from "./series-form";
import { SeriesRow } from "./series-row";

// FIX-091 (W1, Editar clase A): the Serie semanal tab, only for a class a
// weekly schedule generated. Its form changes this class and the following
// ones («Esta y las futuras», follow-up 39); under it, pause (or resume) and
// end the series.
export function SessionSeriesTab({
  session,
  branchId,
  onDone,
}: {
  session: AdministratorSessionAvailabilityDto;
  branchId: string;
  onDone: (notice: string | null) => void;
}) {
  const [failure, setFailure] = useState<string | null>(null);
  const schedules = useQuery(branchSchedulesQueryOptions(branchId));
  const schedule = schedules.data?.find(
    (candidate) => candidate.id === session.sessionScheduleId,
  );

  if (schedule === undefined) {
    return schedules.isPending ? (
      <div className="px-7 py-4">
        <LoadingNotice>Cargando la serie semanal…</LoadingNotice>
      </div>
    ) : (
      <p role="alert" className="px-7 py-4 tipo-cuerpo text-texto">
        Esta serie semanal ya no está vigente. Cambia solo esta clase en Editar.
      </p>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <p className="px-7 pt-4 tipo-compacto text-texto">
        Los cambios valen para esta clase y las siguientes de la serie.
      </p>
      <SeriesForm
        session={session}
        schedule={schedule}
        branchId={branchId}
        failure={failure}
        onFailure={setFailure}
        onDone={onDone}
        footer={null}
      />
      <SeriesRow
        session={session}
        schedule={schedule}
        branchId={branchId}
        onDone={onDone}
        onFailure={setFailure}
      />
    </div>
  );
}
