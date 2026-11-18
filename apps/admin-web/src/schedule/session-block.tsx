import type { AdministratorSessionAvailabilityDto } from "@pilates/api-contracts";
import { StaffPhoto } from "../components/staff-photo";
import { boliviaParts } from "../lib/bolivia-time";
import { cn } from "../lib/cn";
import {
  flagLabel,
  useEquipmentFlag,
  type EquipmentFlag,
} from "./equipment-flag-data";
import { EquipmentDot } from "./equipment-flags";
import {
  cancellationOf,
  causeLabel,
  causeShortLabel,
} from "./session-cancellation";

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

// FIX-042: a cancelled class keeps its place, with its cause. FIX-084
// (Horario A): a faint grey dashed outline, the type, the time and the cause.
function CancelledBlock({
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
  const cause = cancellationOf(session)?.cause ?? "studio";
  const start = boliviaParts(session.startsAt).time;
  return (
    <button
      type="button"
      aria-label={[
        session.classTypeName,
        start,
        session.trainerName,
        causeLabel(cause),
      ].join(", ")}
      onClick={() => onOpen(session)}
      style={style}
      className={cn(
        "flex w-full flex-col items-start justify-start gap-0.5 overflow-hidden rounded-control border border-dashed border-borde bg-transparent px-2 py-1 text-left text-texto-muy-tenue transition-shadow hover:bg-lino focus-visible:shadow-foco lg:px-1.5 xl:px-2",
        className,
      )}
    >
      <span className="w-full text-ayuda leading-tight break-words xl:text-[12.5px]">
        {session.classTypeName}
      </span>
      <span className="w-full text-ayuda leading-tight tabular">
        {start} · {causeShortLabel(cause)}
      </span>
    </button>
  );
}

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
  if (cancellationOf(session) !== null) {
    return (
      <CancelledBlock
        session={session}
        onOpen={onOpen}
        className={className}
        style={style}
      />
    );
  }
  return (
    <StandingBlock
      session={session}
      onOpen={onOpen}
      className={className}
      style={style}
    />
  );
}

// FIX-084 (Horario A): every standing block is white with a thin border,
// one accent at most: the amber dot of a class short of Equipment. The
// trainer has a line of her own, so her name is never cut off.
function StandingBlock({
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
        "flex w-full flex-col items-start justify-start gap-px overflow-hidden rounded-control border border-borde bg-blanco px-2 py-1 text-left text-texto transition-shadow hover:bg-hover-fila focus-visible:shadow-foco lg:px-1.5 xl:px-2",
        className,
      )}
    >
      <span className="flex w-full items-center gap-1.5 text-ayuda leading-tight font-medium whitespace-nowrap xl:text-[12.5px]">
        {flag === undefined ? null : <EquipmentDot />}
        {session.classTypeName}
      </span>
      <span className="w-full text-ayuda leading-tight whitespace-nowrap text-texto-secundario tabular">
        {start} – {end}
      </span>
      <span className="flex w-full items-center text-ayuda leading-tight break-words text-texto-secundario">
        {/* Follow-up 242: her photo leads her name, when she has one. */}
        {session.trainerPhoto === null ? null : (
          <StaffPhoto
            name={session.trainerName}
            photo={session.trainerPhoto}
            size={20}
            className="mr-1 shrink-0"
          />
        )}
        <span className="min-w-0">{session.trainerName}</span>
      </span>
      <span className="text-ayuda leading-tight text-texto-tenue tabular">
        {occupancy(session)}
      </span>
    </button>
  );
}
