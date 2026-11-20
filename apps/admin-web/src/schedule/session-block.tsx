import {
  capacityLabel,
  type AdministratorSessionAvailabilityDto,
} from "@pilates/api-contracts";
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
    capacityLabel(session.bookedCount, session.capacity),
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
    : capacityLabel(session.bookedCount, session.capacity);

// FIX-042: a cancelled class keeps its place, with its cause. FIX-091 (W2,
// Horario B): one thin line, its cause alone in the week grid, where its
// place already gives the day and hour; the day list adds the time and type.
function CancelledBlock({
  session,
  onOpen,
  layout,
  className,
  style,
}: {
  session: Session;
  onOpen: (session: Session) => void;
  layout: "grid" | "list";
  className?: string;
  style?: React.CSSProperties;
}) {
  const cause = cancellationOf(session)?.cause ?? "studio";
  const start = boliviaParts(session.startsAt).time;
  return (
    <button
      type="button"
      data-cancelled="line"
      aria-label={[
        session.classTypeName,
        start,
        session.trainerName,
        causeLabel(cause),
      ].join(", ")}
      onClick={() => onOpen(session)}
      style={style}
      className={cn(
        "flex w-full items-center overflow-hidden rounded-[8px] bg-superficie-hundida px-2.5 text-left text-pie leading-tight text-texto inset-ring inset-ring-borde-fuerte transition-shadow hover:bg-blanco focus-visible:shadow-foco",
        layout === "list" && "min-h-11 rounded-panel text-celda",
        className,
      )}
    >
      <span className="truncate tabular">
        {layout === "list"
          ? `${start} · ${session.classTypeName} · ${causeShortLabel(cause)}`
          : causeShortLabel(cause)}
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
  short = false,
  layout = "grid",
  className,
  style,
}: {
  session: Session;
  onOpen: (session: Session) => void;
  /** A class shorter than an hour puts its places on the time line. */
  short?: boolean;
  layout?: "grid" | "list";
  className?: string;
  style?: React.CSSProperties;
}) {
  if (cancellationOf(session) !== null) {
    return (
      <CancelledBlock
        session={session}
        onOpen={onOpen}
        layout={layout}
        className={className}
        style={style}
      />
    );
  }
  return (
    <StandingBlock
      session={session}
      onOpen={onOpen}
      short={short}
      layout={layout}
      className={className}
      style={style}
    />
  );
}

/** Rosa Emma (follow-up 284): Reformer 600, Mat 300, Cadillac 500. */
const typeBar = (classTypeName: string): string =>
  /cadillac/i.test(classTypeName)
    ? "bg-tipo-cadillac"
    : /mat/i.test(classTypeName)
      ? "bg-tipo-mat"
      : "bg-tipo-reformer";

/** W2: «Daniela · 4 de 8», «Daniela · Llena · 3 en espera». */
const gridLine = (session: Session): string => {
  const firstName = session.trainerName.split(" ")[0] ?? session.trainerName;
  const places =
    session.bookedCount >= session.capacity
      ? occupancy(session)
      : `${session.bookedCount} de ${session.capacity}`;
  return `${firstName} · ${places}`;
};

// Rosa Emma (RW-horario): every standing block is a white card with the
// class type's colour bar, one accent at most: the dot of a class short of
// Equipment. W2 (verification 2026-11-20): in the week grid two lines, the
// type, then the trainer's first name and the places; the day list keeps
// the time, her photo and full name.
function StandingBlock({
  session,
  onOpen,
  short,
  layout,
  className,
  style,
}: {
  session: Session;
  onOpen: (session: Session) => void;
  short: boolean;
  layout: "grid" | "list";
  className?: string;
  style?: React.CSSProperties;
}) {
  const flag = useEquipmentFlag(session.id);
  const start = boliviaParts(session.startsAt).time;
  const end = boliviaParts(session.endsAt).time;

  if (layout === "grid") {
    return (
      <button
        type="button"
        aria-label={sessionLabel(session, flag)}
        onClick={() => onOpen(session)}
        style={style}
        className={cn(
          "flex w-full items-stretch gap-1.5 overflow-hidden rounded-panel bg-superficie py-1.5 pr-2 pl-1.5 text-left text-texto shadow-tarjeta transition-shadow hover:shadow-tarjeta-hover focus-visible:shadow-foco",
          className,
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "w-1 shrink-0 rounded-full",
            typeBar(session.classTypeName),
          )}
        />
        <span className="flex min-w-0 flex-col gap-px">
          <span
            data-line=""
            className="flex items-center gap-1.5 text-nota leading-tight font-bold break-words"
          >
            {flag === undefined ? null : <EquipmentDot />}
            {session.classTypeName}
          </span>
          <span
            data-line=""
            className="truncate text-pie leading-tight tabular"
          >
            {gridLine(session)}
          </span>
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-label={sessionLabel(session, flag)}
      onClick={() => onOpen(session)}
      style={style}
      className={cn(
        "flex w-full flex-col items-start justify-start gap-px overflow-hidden rounded-control border border-borde-fuerte bg-blanco px-2 py-1 text-left text-texto transition-shadow hover:bg-superficie-hundida focus-visible:shadow-foco lg:px-1.5 xl:px-2",
        className,
      )}
    >
      <span className="flex w-full items-center gap-1.5 text-ayuda leading-tight font-medium whitespace-nowrap xl:text-nota">
        {flag === undefined ? null : <EquipmentDot />}
        {session.classTypeName}
      </span>
      <span className="w-full text-ayuda leading-tight whitespace-nowrap text-texto tabular">
        {start} – {end}
        {short ? (
          <>
            {" · "}
            <span>{occupancy(session)}</span>
          </>
        ) : null}
      </span>
      <span className="flex w-full items-center text-ayuda leading-tight break-words text-texto">
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
      {short ? null : (
        <span className="text-ayuda leading-tight text-texto tabular">
          {occupancy(session)}
        </span>
      )}
    </button>
  );
}
