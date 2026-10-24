import type { AdministratorSessionAvailabilityDto } from "@pilates/api-contracts";
import { boliviaParts } from "../lib/bolivia-time";
import { cn } from "../lib/cn";
import {
  flagLabel,
  useEquipmentFlag,
  type EquipmentFlag,
} from "./equipment-flag-data";
import { EquipmentFlagLine } from "./equipment-flags";

type Session = AdministratorSessionAvailabilityDto;

const sessionLabel = (session: Session, flag?: EquipmentFlag): string =>
  [
    session.classTypeName,
    boliviaParts(session.startsAt).time,
    session.trainerName,
    `${session.bookedCount} de ${session.capacity} lugares`,
    ...(session.waitlistCount > 0
      ? [`${session.waitlistCount} en lista de espera`]
      : []),
    ...(flag === undefined ? [] : [flagLabel(flag)]),
  ].join(", ");

const occupancy = (session: Session): string =>
  session.bookedCount >= session.capacity
    ? session.waitlistCount > 0
      ? `Llena · ${session.waitlistCount} en espera`
      : "Llena"
    : `${session.bookedCount}/${session.capacity}`;

// AW02: each block names the Class Type, the Bolivia start time, and the
// Trainer; a full Session reads as such, with its waitlist. A Session with
// more places than working Equipment carries the warning (follow-up 170).
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
  const flag = useEquipmentFlag(session.id);
  const start = boliviaParts(session.startsAt).time;
  const end = boliviaParts(session.endsAt).time;

  return (
    <button
      type="button"
      aria-label={sessionLabel(session, flag)}
      onClick={() => onOpen(session)}
      style={style}
      className={cn(
        "flex w-full flex-col items-start justify-center gap-0.5 overflow-hidden rounded-control border-l-[3px] px-2 py-1 text-left transition-shadow hover:shadow-tarjeta-hover focus-visible:shadow-foco",
        full
          ? "border-advertencia bg-advertencia/12"
          : "border-primario bg-primario-tinte",
        flag === undefined ? null : "border-advertencia",
        className,
      )}
    >
      <span className="flex w-full items-baseline justify-between gap-2">
        <span className="truncate text-[12.5px] font-medium text-texto">
          {session.classTypeName}
        </span>
        <span
          className={cn(
            "shrink-0 text-ayuda tabular",
            full ? "text-advertencia-texto" : "text-primario-profundo",
          )}
        >
          {occupancy(session)}
        </span>
      </span>
      <span className="w-full truncate text-ayuda text-texto-secundario tabular">
        {start} – {end} · {session.trainerName}
      </span>
      {flag === undefined ? null : <EquipmentFlagLine flag={flag} />}
    </button>
  );
}
