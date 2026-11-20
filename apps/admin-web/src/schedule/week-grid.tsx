import type { AdministratorSessionAvailabilityDto } from "@pilates/api-contracts";
import { addDays, formatDayTab } from "../lib/bolivia-time";
import { cn } from "../lib/cn";
import type { SessionStart } from "./session-create-form";
import { SessionBlock } from "./session-block";
import { EmptySlot } from "./empty-slot";
import { dayItems, hourLabel, sessionSpan } from "./week-slots";

type Session = AdministratorSessionAvailabilityDto;

// W2 (verification 2026-11-20): a class is two lines (type; trainer and
// places), so an hour needs less height than FIX-084's four.
const hourHeight = 64;
// FIX-091 (W2, Horario B): a cancelled class is one thin line at its start.
const cancelledLineHeight = 22;
const minimumBlockHeight = 52;

const hourLines = (color: string) =>
  `repeating-linear-gradient(to bottom, transparent 0, transparent ${hourHeight - 1}px, var(${color}) ${hourHeight - 1}px, var(${color}) ${hourHeight}px)`;

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
    <div role="table" aria-label="Semana" className="flex flex-col gap-2">
      <div
        role="row"
        className="grid grid-cols-[44px_repeat(7,minmax(0,1fr))] gap-1.5 lg:grid-cols-7 xl:grid-cols-[64px_repeat(7,minmax(0,1fr))]"
      >
        <span aria-hidden="true" className="lg:hidden xl:block" />
        {days.map((day) => {
          const tab = formatDayTab(day);
          return (
            <span
              key={day}
              role="columnheader"
              className={cn(
                // Rosa Emma (RW-horario): a white pill per day; today's is
                // solid Rosa profundo with «· HOY», its column only soft 50.
                "flex items-baseline justify-center gap-1.5 rounded-panel bg-superficie px-1.5 py-[9px] tipo-etiqueta text-texto",
                day === today && "bg-primario text-sobre-primario",
              )}
            >
              {tab.weekday}
              <span className="tipo-titulo-fila tabular">{tab.day}</span>
              {day === today ? <span>· hoy</span> : null}
            </span>
          );
        })}
      </div>
      <div
        role="row"
        className="grid grid-cols-[44px_repeat(7,minmax(0,1fr))] gap-1.5 lg:grid-cols-7 xl:grid-cols-[64px_repeat(7,minmax(0,1fr))]"
        style={{ backgroundImage: hourLines("--color-borde") }}
      >
        <div
          aria-hidden="true"
          className="relative lg:hidden xl:block"
          style={{ height }}
        >
          {hours.map((hour, index) => (
            <span
              key={hour}
              className="absolute left-0 -translate-y-1/2 tipo-destacado text-texto tabular"
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
              "relative",
              day === today && "rounded-panel bg-superficie-hundida",
            )}
            style={{
              height,
              // Today's soft column covers the row's lines: it draws its own.
              ...(day === today
                ? { backgroundImage: hourLines("--color-borde") }
                : {}),
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
              const top = ((item.minutes - first * 60) / 60) * hourHeight + 1;
              if ((session.cancellation ?? null) !== null) {
                return (
                  <SessionBlock
                    key={session.id}
                    session={session}
                    onOpen={onOpen}
                    className="absolute inset-x-1"
                    style={{ top, height: cancelledLineHeight }}
                  />
                );
              }
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
                    top,
                    // Room for both lines even when the type wraps (W2).
                    height: Math.max(
                      (minutes / 60) * hourHeight - 2,
                      minimumBlockHeight,
                    ),
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
