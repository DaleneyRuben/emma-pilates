import type { AdministratorSessionAvailabilityDto } from "@pilates/api-contracts";
import { addDays, boliviaParts, formatDayTab } from "../lib/bolivia-time";
import { selectedClass, unselectedClass } from "../components/ui/chip";
import { cn } from "../lib/cn";
import { SessionBlock } from "./session-block";
import { cancellationOf } from "./session-cancellation";

type Session = AdministratorSessionAvailabilityDto;

// AW02 narrow: one day at a time behind scrollable day tabs.
export function DayList({
  monday,
  today,
  day,
  onDayChange,
  sessions,
  onOpen,
}: {
  monday: string;
  today: string;
  day: string;
  onDayChange: (day: string) => void;
  sessions: readonly Session[];
  onOpen: (session: Session) => void;
}) {
  const days = Array.from({ length: 7 }, (_, index) => addDays(monday, index));
  const ofDay = sessions.filter(
    (session) => boliviaParts(session.startsAt).date === day,
  );

  return (
    <div className="flex flex-col gap-3">
      <div
        role="tablist"
        aria-label="Días de la semana"
        className="flex gap-1.5 overflow-x-auto pb-1"
      >
        {days.map((date) => {
          const tab = formatDayTab(date);
          const selected = date === day;
          return (
            <button
              key={date}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onDayChange(date)}
              className={cn(
                "flex min-w-[52px] shrink-0 flex-col items-center rounded-control border px-2 py-1.5 text-ayuda",
                selected ? selectedClass : unselectedClass,
                // FIX-091 (W2, Horario B): today stays in Rubor.
                date === today && !selected && "bg-rosa-200",
              )}
            >
              <span>{tab.weekday}</span>
              <span className="font-serif text-fila tabular">{tab.day}</span>
              {date === today ? (
                <span className="text-pie leading-none">hoy</span>
              ) : null}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" className="flex flex-col gap-2">
        {ofDay.length === 0 ? (
          <p className="rounded-tarjeta bg-superficie shadow-tarjeta px-4 py-6 text-center text-nota text-texto">
            Sin clases este día.
          </p>
        ) : (
          ofDay.map((session) => (
            <SessionBlock
              key={session.id}
              session={session}
              onOpen={onOpen}
              layout="list"
              className={
                cancellationOf(session) === null ? "min-h-[64px]" : undefined
              }
            />
          ))
        )}
      </div>
    </div>
  );
}
