import type { AdminSessionScheduleDto } from "@pilates/api-contracts";
import { useId, useState } from "react";
import { ConfirmDialog } from "../components/ui/confirm-dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { endedNotice } from "./schedule-notices";
import { scheduleProblem } from "./schedule-problems";
import { useScheduleChange } from "./use-schedule-change";

// Ending a weekly schedule from a date cancels only its unbooked future
// Sessions; booked ones stay until edited or cancelled one by one (ADR-0059).
export function EndSeriesAction({
  open,
  onOpenChange,
  schedule,
  branchId,
  earliest,
  defaultDate,
  onDone,
  onFailure,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: AdminSessionScheduleDto;
  branchId: string;
  earliest: string;
  defaultDate: string;
  onDone: (notice: string) => void;
  onFailure: (message: string | null) => void;
}) {
  const change = useScheduleChange(branchId);
  const [date, setDate] = useState(defaultDate);
  const dateId = useId();
  const valid = date !== "" && date >= earliest;

  const end = async () => {
    onFailure(null);
    try {
      const outcome = await change.mutateAsync({
        kind: "end-schedule",
        scheduleId: schedule.id,
        effectiveFrom: date,
      });
      onOpenChange(false);
      if (outcome.kind === "end-schedule") {
        onDone(endedNotice(outcome.result, date));
      }
    } catch (error) {
      onOpenChange(false);
      onFailure(scheduleProblem(error).message);
    }
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="¿Terminar esta serie semanal?"
      confirmLabel="Terminar serie"
      busy={change.isPending}
      pending={!valid}
      onConfirm={() => void end()}
    >
      <p>
        {schedule.classTypeName} deja de repetirse desde la fecha que elijas.
        Las sesiones sin reservas se cancelan; las que tienen reservas o lista
        de espera se mantienen.
      </p>
      <div className="flex flex-col gap-1.5 pt-1">
        <Label htmlFor={dateId}>Deja de repetirse desde</Label>
        <Input
          id={dateId}
          type="date"
          min={earliest}
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
      </div>
    </ConfirmDialog>
  );
}
