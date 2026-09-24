import type { AdministratorSessionAvailabilityDto } from "@pilates/api-contracts";
import { addDays, boliviaParts, formatDayTab } from "../lib/bolivia-time";
import { cn } from "../lib/cn";
import { SessionBlock } from "./session-block";

type Session = AdministratorSessionAvailabilityDto;

const hourHeight = 56;

/** The hours the grid spans: 06:00–22:00, widened to fit every Session. */
function hourRange(sessions: readonly Session[]) {
  let first = 6;
  let last = 22;
  for (const session of sessions) {
    first = Math.min(
      first,
      Math.floor(boliviaParts(session.startsAt).minutes / 60),
    );
    const end = boliviaParts(session.endsAt);
    const endMinutes =
      end.date === boliviaParts(session.startsAt).date ? end.minutes : 24 * 60;
    last = Math.max(last, Math.ceil(endMinutes / 60));
  }
  return { first, last };
}

// AW02 desktop: seven day columns on a shared Bolivia time axis. A Branch
// has one studio room, so each column is a single stack of blocks.
export function WeekGrid({
  monday,
  today,
  sessions,
  onOpen,
}: {
  monday: string;
  today: string;
  sessions: readonly Session[];
  onOpen: (session: Session) => void;
}) {
  const days = Array.from({ length: 7 }, (_, index) => addDays(monday, index));
  const { first, last } = hourRange(sessions);
  const hours = Array.from(
    { length: last - first },
    (_, index) => first + index,
  );
  const height = (last - first) * hourHeight;

  return (
    <div
      role="table"
      aria-label="Semana"
      className="overflow-hidden rounded-tarjeta border border-borde bg-blanco"
    >
      <div
        role="row"
        className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b border-borde bg-superficie-sutil"
      >
        <span aria-hidden="true" />
        {days.map((day) => {
          const tab = formatDayTab(day);
          return (
            <span
              key={day}
              role="columnheader"
              className={cn(
                "flex items-baseline gap-1.5 px-3 py-2.5 text-cabecera-tabla font-medium tracking-[0.14em] text-texto-tenue uppercase",
                day === today && "text-primario",
              )}
            >
              {tab.weekday}
              <span className="font-serif text-[15px] tracking-normal text-texto normal-case tabular">
                {tab.day}
              </span>
              {day === today ? (
                <span className="tracking-normal normal-case">· hoy</span>
              ) : null}
            </span>
          );
        })}
      </div>
      <div role="row" className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))]">
        <div aria-hidden="true" className="relative" style={{ height }}>
          {hours.map((hour, index) => (
            <span
              key={hour}
              className="absolute right-2 -translate-y-1/2 text-ayuda text-texto-muy-tenue tabular"
              style={{ top: index * hourHeight }}
            >
              {index === 0 ? null : `${String(hour).padStart(2, "0")}:00`}
            </span>
          ))}
        </div>
        {days.map((day) => (
          <div
            key={day}
            role="cell"
            className={cn(
              "relative border-l border-divisor",
              day === today && "bg-hover-fila",
            )}
            style={{
              height,
              backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${hourHeight - 1}px, var(--color-divisor) ${hourHeight - 1}px, var(--color-divisor) ${hourHeight}px)`,
            }}
          >
            {sessions
              .filter((session) => boliviaParts(session.startsAt).date === day)
              .map((session) => {
                const start = boliviaParts(session.startsAt).minutes;
                const minutes =
                  (new Date(session.endsAt).getTime() -
                    new Date(session.startsAt).getTime()) /
                  60_000;
                return (
                  <SessionBlock
                    key={session.id}
                    session={session}
                    onOpen={onOpen}
                    className="absolute inset-x-1"
                    style={{
                      top: ((start - first * 60) / 60) * hourHeight + 1,
                      height: Math.max((minutes / 60) * hourHeight - 2, 52),
                    }}
                  />
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
}
