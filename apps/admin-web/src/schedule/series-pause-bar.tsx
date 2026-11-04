import type { AdminSessionScheduleDto } from "@pilates/api-contracts";
import { CirclePause } from "lucide-react";
import { useState } from "react";
import { Button } from "../components/ui/button";
import { StatusPill } from "../components/ui/status-pill";
import { addDays, boliviaToday, formatDayMonth } from "../lib/bolivia-time";
import { PauseSeriesAction } from "./pause-series-action";
import { resumedNotice } from "./schedule-notices";
import { scheduleProblem } from "./schedule-problems";
import { useScheduleChange } from "./use-schedule-change";

// A pause still running or still ahead; one already over reads as none.
const activePause = (schedule: AdminSessionScheduleDto, today: string) =>
  schedule.pausedFrom !== null &&
  (schedule.pausedUntil === null || schedule.pausedUntil > today)
    ? { from: schedule.pausedFrom, until: schedule.pausedUntil }
    : null;

// The API keeps «Vuelve el»; the sentence names the last paused day.
const pauseNote = (pause: { from: string; until: string | null }) =>
  pause.until === null
    ? `En pausa desde el ${formatDayMonth(pause.from)}, hasta que la reanudes.`
    : `En pausa del ${formatDayMonth(pause.from)} al ${formatDayMonth(addDays(pause.until, -1))}.`;

// BKM-018 (follow-up 234, P02b): the series' pause state and its action in
// the class panel, whichever scope the edit form shows.
export function SeriesPauseBar({
  schedule,
  branchId,
  onDone,
  onFailure,
}: {
  schedule: AdminSessionScheduleDto;
  branchId: string;
  onDone: (notice: string) => void;
  onFailure: (message: string | null) => void;
}) {
  const change = useScheduleChange(branchId);
  const [pausing, setPausing] = useState(false);
  const pause = activePause(schedule, boliviaToday());

  const resume = async () => {
    onFailure(null);
    try {
      await change.mutateAsync({
        kind: "resume-schedule",
        scheduleId: schedule.id,
      });
      onDone(resumedNotice);
    } catch (error) {
      onFailure(scheduleProblem(error).message);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {pause === null ? (
        <Button variant="secondary" onClick={() => setPausing(true)}>
          Pausar la serie
        </Button>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <StatusPill tone="advertencia">Serie en pausa</StatusPill>
          </div>
          <p className="flex items-center gap-3 rounded-tarjeta border-l-4 border-advertencia bg-lino px-4 py-3 text-celda text-texto">
            <CirclePause
              size={18}
              aria-hidden="true"
              className="shrink-0 text-advertencia-texto"
            />
            {pauseNote(pause)}
          </p>
          <Button
            variant="secondary"
            busy={change.isPending}
            onClick={() => void resume()}
          >
            Reanudar la serie
          </Button>
        </>
      )}
      <PauseSeriesAction
        open={pausing}
        onOpenChange={setPausing}
        schedule={schedule}
        branchId={branchId}
        onDone={onDone}
        onFailure={onFailure}
      />
    </div>
  );
}
