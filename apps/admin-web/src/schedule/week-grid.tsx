import type { AdministratorSessionAvailabilityDto } from "@pilates/api-contracts";
import { Plus } from "lucide-react";
import {
  addDays,
  boliviaParts,
  formatDayTab,
  formatLongDay,
} from "../lib/bolivia-time";
import { cn } from "../lib/cn";
import type { SessionStart } from "./session-create-form";
import { SessionBlock } from "./session-block";

type Session = AdministratorSessionAvailabilityDto;

const hourHeight = 64;

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

const pad = (hour: number) => `${String(hour).padStart(2, "0")}:00`;

/** Minutes of a Session on its Bolivia start day, clipped at midnight. */
function span(session: Session) {
  const start = boliviaParts(session.startsAt);
  const end = boliviaParts(session.endsAt);
  return {
    start: start.minutes,
    end: end.date === start.date ? end.minutes : 24 * 60,
  };
}

// Follow-up 96: every hour of a day that no Session fully covers is an empty
// slot that opens «Nueva sesión» there. Slots sit before the blocks of the
// same start in the DOM, so Tab follows the day and blocks paint on top.
function dayItems(day: string, hours: number[], sessions: readonly Session[]) {
  const ofDay = sessions.filter(
    (session) => boliviaParts(session.startsAt).date === day,
  );
  const spans = ofDay.map(span);
  const slots = hours
    .filter(
      (hour) =>
        !spans.some(
          ({ start, end }) => start <= hour * 60 && end >= (hour + 1) * 60,
        ),
    )
    .map((hour) => ({ kind: "slot" as const, hour, minutes: hour * 60 }));
  const blocks = ofDay.map((session, index) => ({
    kind: "session" as const,
    session,
    minutes: spans[index]?.start ?? 0,
  }));
  return [...slots, ...blocks].sort(
    (a, b) =>
      a.minutes - b.minutes ||
      (a.kind === b.kind ? 0 : a.kind === "slot" ? -1 : 1),
  );
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
              {index === 0 ? null : pad(hour)}
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
                const time = pad(item.hour);
                return (
                  <button
                    key={time}
                    type="button"
                    aria-label={`Nueva sesión el ${formatLongDay(day)} a las ${time}`}
                    onClick={() => onCreate({ date: day, time })}
                    className="group absolute inset-x-1 flex items-start gap-1 rounded-control border border-dashed border-transparent px-2 py-1 text-ayuda font-medium text-primario-profundo hover:border-primario hover:bg-hover-fila focus-visible:border-primario focus-visible:bg-hover-fila focus-visible:shadow-foco"
                    style={{
                      top: (item.hour - first) * hourHeight + 1,
                      height: hourHeight - 2,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
                    >
                      <Plus size={14} strokeWidth={1.8} />
                      {time}
                    </span>
                  </button>
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
