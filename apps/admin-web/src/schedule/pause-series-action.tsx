import type { AdminSessionScheduleDto } from "@pilates/api-contracts";
import { useId, useState } from "react";
import { parseCivilDate } from "../components/form/civil-date";
import { CivilDateInput } from "../components/form/civil-date-input";
import { ConfirmDialog } from "../components/ui/confirm-dialog";
import { Label } from "../components/ui/label";
import { boliviaToday } from "../lib/bolivia-time";
import { pausedNotice } from "./schedule-notices";
import { scheduleProblem } from "./schedule-problems";
import { useScheduleChange } from "./use-schedule-change";

// BKM-018 (follow-up 234, P02b): «Pausar desde» is the first date without
// classes and «Vuelve el» the first date with classes again, as the API
// keeps them; left empty, the series stays paused until it is resumed.
export function PauseSeriesAction({
  open,
  onOpenChange,
  schedule,
  branchId,
  onDone,
  onFailure,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: AdminSessionScheduleDto;
  branchId: string;
  onDone: (notice: string) => void;
  onFailure: (message: string | null) => void;
}) {
  const change = useScheduleChange(branchId);
  const [from, setFrom] = useState("");
  const [until, setUntil] = useState("");
  const fromId = useId();
  const untilId = useId();
  const validFrom = parseCivilDate(from) !== null && from >= boliviaToday();
  const validUntil =
    until === "" || (parseCivilDate(until) !== null && until > from);

  const pause = async () => {
    onFailure(null);
    const pausedUntil = until === "" ? null : until;
    try {
      await change.mutateAsync({
        kind: "pause-schedule",
        scheduleId: schedule.id,
        pausedFrom: from,
        pausedUntil,
      });
      onOpenChange(false);
      onDone(pausedNotice(pausedUntil));
    } catch (error) {
      onOpenChange(false);
      onFailure(scheduleProblem(error).message);
    }
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Pausar la serie"
      confirmLabel="Pausar la serie"
      tone="primary"
      busy={change.isPending}
      pending={!validFrom || !validUntil}
      onConfirm={() => void pause()}
    >
      <p>
        En esas fechas no se publican clases de la serie. Las que ya tienen
        reservas se mantienen; cancélalas una por una si hace falta.
      </p>
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={fromId}>Pausar desde</Label>
          <CivilDateInput id={fromId} value={from} onChange={setFrom} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={untilId}>Vuelve el (opcional)</Label>
          <CivilDateInput
            id={untilId}
            value={until}
            onChange={setUntil}
            placeholder="Hasta que la reanudes"
          />
        </div>
      </div>
    </ConfirmDialog>
  );
}
