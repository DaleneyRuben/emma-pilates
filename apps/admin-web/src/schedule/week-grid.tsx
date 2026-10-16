import type { AdministratorSessionAvailabilityDto } from "@pilates/api-contracts";
import { addDays, formatDayTab } from "../lib/bolivia-time";
import { cn } from "../lib/cn";
import type { SessionStart } from "./session-create-form";
import { SessionBlock } from "./session-block";
import { EmptySlot } from "./empty-slot";
import { dayItems, hourLabel, sessionSpan } from "./week-slots";

type Session = AdministratorSessionAvailabilityDto;

const hourHeight = 64;

/** The hours the grid spans: 06:00–22:00, widened to fit every Session. */
function hourRange(sessions: readonly Session[]) {
  let first = 6;
  let last = 22;
  for (const session of sessions) {
    const { start, end } = sessionSpan(session);
    first = Math.min(first, Math.floor(start / 60));
    last = Math.max(last, Math.ceil(end / 60));
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
  onCreate,
}: {
  monday: string;
  today: string;
  sessions: readonly Session[];
  onOpen: (session: Session) => void;
  onCreate: (start: SessionStart) => void;
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
              {index === 0 ? null : hourLabel(hour)}
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
            {dayItems(day, hours, sessions).map((item) => {
              if (item.kind === "slot") {
                return (
                  <EmptySlot
                    key={item.hour}
                    day={day}
                    hour={item.hour}
                    onCreate={onCreate}
                    style={{
                      top: (item.hour - first) * hourHeight + 1,
                      height: hourHeight - 2,
                    }}
                  />
                );
              }
              const { session } = item;
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
                    top: ((item.minutes - first * 60) / 60) * hourHeight + 1,
                    height: Math.max((minutes / 60) * hourHeight - 2, 44),
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
