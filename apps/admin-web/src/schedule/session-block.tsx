import type { AdministratorSessionAvailabilityDto } from "@pilates/api-contracts";
import { boliviaParts } from "../lib/bolivia-time";
import { cn } from "../lib/cn";

type Session = AdministratorSessionAvailabilityDto;

const sessionLabel = (session: Session): string =>
  [
    session.classTypeName,
    boliviaParts(session.startsAt).time,
    session.trainerName,
    `${session.bookedCount} de ${session.capacity} lugares`,
    ...(session.waitlistCount > 0
      ? [`${session.waitlistCount} en lista de espera`]
      : []),
  ].join(", ");

const occupancy = (session: Session): string =>
  session.bookedCount >= session.capacity
    ? session.waitlistCount > 0
      ? `Llena · ${session.waitlistCount} en espera`
      : "Llena"
    : `${session.bookedCount}/${session.capacity}`;

// AW02: each block names the Class Type, the Bolivia start time, and the
// Trainer; a full Session reads as such, with its waitlist.
export function SessionBlock({
  session,
  onOpen,
  className,
  style,
}: {
  session: Session;
  onOpen: (session: Session) => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const full = session.bookedCount >= session.capacity;
  const start = boliviaParts(session.startsAt).time;
  const end = boliviaParts(session.endsAt).time;

  return (
    <button
      type="button"
      aria-label={sessionLabel(session)}
      onClick={() => onOpen(session)}
      style={style}
      className={cn(
        "flex w-full flex-col items-start gap-0.5 overflow-hidden rounded-control border-l-[3px] px-2.5 py-1.5 text-left transition-shadow hover:shadow-tarjeta-hover focus-visible:shadow-foco",
        full
          ? "border-advertencia bg-advertencia/12"
          : "border-primario bg-primario-tinte",
        className,
      )}
    >
      <span className="w-full truncate text-[12.5px] font-medium text-texto">
        {session.classTypeName}
      </span>
      <span className="w-full truncate text-ayuda text-texto-secundario tabular">
        {start} – {end} · {session.trainerName}
      </span>
      <span
        className={cn(
          "text-ayuda tabular",
          full ? "text-advertencia-texto" : "text-primario-profundo",
        )}
      >
        {occupancy(session)}
      </span>
    </button>
  );
}
