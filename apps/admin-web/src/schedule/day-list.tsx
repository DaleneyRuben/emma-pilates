import type { AdministratorSessionAvailabilityDto } from "@pilates/api-contracts";
import { addDays, boliviaParts, formatDayTab } from "../lib/bolivia-time";
import { cn } from "../lib/cn";
import { SessionBlock } from "./session-block";

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
                selected
                  ? "border-primario bg-primario-tinte font-medium text-primario-profundo"
                  : "border-borde bg-blanco text-texto-secundario",
              )}
            >
              <span>{tab.weekday}</span>
              <span className="font-serif text-[15px] tabular">
                {tab.day}
                {date === today ? " ·" : ""}
              </span>
            </button>
          );
        })}
      </div>
      <div role="tabpanel" className="flex flex-col gap-2">
        {ofDay.length === 0 ? (
          <p className="rounded-tarjeta border border-borde bg-blanco px-4 py-6 text-center text-nota text-texto-tenue">
            Sin sesiones este día.
          </p>
        ) : (
          ofDay.map((session) => (
            <SessionBlock
              key={session.id}
              session={session}
              onOpen={onOpen}
              className="min-h-[64px]"
            />
          ))
        )}
      </div>
    </div>
  );
}
