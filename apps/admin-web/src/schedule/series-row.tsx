import type {
  AdminSessionScheduleDto,
  AdministratorSessionAvailabilityDto,
} from "@pilates/api-contracts";
import { CirclePause } from "lucide-react";
import { useState } from "react";
import { Button } from "../components/ui/button";
import { StatusPill } from "../components/ui/status-pill";
import {
  addDays,
  boliviaParts,
  boliviaToday,
  formatDayMonth,
  weekdayName,
  weekdayOf,
} from "../lib/bolivia-time";
import { EndSeriesAction } from "./end-series-action";
import { PauseSeriesAction } from "./pause-series-action";
import { firstChangeDate } from "./schedule-dates";
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

// BKM-018 (P02b): a paused series says so at the top of the class panel.
export function SeriesPauseNotice({
  schedule,
}: {
  schedule: AdminSessionScheduleDto;
}) {
  const pause = activePause(schedule, boliviaToday());
  if (pause === null) return null;
  return (
    <div className="flex flex-col gap-3">
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
    </div>
  );
}

// FIX-042 (proposal A, follow-up 245): the actions on the whole series sit
// in a quiet row under the class's own save and cancel, whichever scope the
// form shows: pause (or resume) and end.
export function SeriesRow({
  session,
  schedule,
  branchId,
  onDone,
  onFailure,
}: {
  session: AdministratorSessionAvailabilityDto;
  schedule: AdminSessionScheduleDto;
  branchId: string;
  onDone: (notice: string) => void;
  onFailure: (message: string | null) => void;
}) {
  const change = useScheduleChange(branchId);
  const [pausing, setPausing] = useState(false);
  const [ending, setEnding] = useState(false);
  const today = boliviaToday();
  const pause = activePause(schedule, today);
  const earliest = firstChangeDate(schedule, today);
  const sessionDate = boliviaParts(session.startsAt).date;
  const defaultDate = sessionDate > earliest ? sessionDate : earliest;
  const weekday = weekdayName(weekdayOf(sessionDate)).toLocaleLowerCase("es");

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
    <div className="flex flex-col gap-2 border-t border-divisor px-7 pt-4 pb-6">
      <p className="text-nota text-texto-tenue">
        Serie semanal · cada {weekday} {boliviaParts(session.startsAt).time}
      </p>
      <div className="flex flex-wrap gap-2">
        {pause === null ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPausing(true)}
          >
            Pausar la serie
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            busy={change.isPending}
            onClick={() => void resume()}
          >
            Reanudar la serie
          </Button>
        )}
        <Button variant="secondary" size="sm" onClick={() => setEnding(true)}>
          Terminar la serie
        </Button>
      </div>
      <PauseSeriesAction
        open={pausing}
        onOpenChange={setPausing}
        schedule={schedule}
        branchId={branchId}
        onDone={onDone}
        onFailure={onFailure}
      />
      <EndSeriesAction
        open={ending}
        onOpenChange={setEnding}
        schedule={schedule}
        branchId={branchId}
        earliest={earliest}
        defaultDate={defaultDate}
        onDone={onDone}
        onFailure={onFailure}
      />
    </div>
  );
}
