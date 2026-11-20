import { Link } from "@tanstack/react-router";
import { TextLink } from "../components/ui/text-link";
import { typeEquipment, type EquipmentFlag } from "./equipment-flag-data";

/**
 * FIX-084 (Horario A): a class with more places than working Equipment
 * carries only this small amber dot; the panel explains it.
 */
export function EquipmentDot() {
  return (
    <span
      aria-hidden="true"
      data-testid="equipment-dot"
      className="size-[7px] shrink-0 rounded-full bg-texto ring-1 ring-texto"
    />
  );
}

/** FIX-084: the panel's sentence for a class short of Equipment. */
export function EquipmentFlagNote({ flag }: { flag: EquipmentFlag }) {
  return (
    <p className="flex items-start gap-2 rounded-tarjeta bg-superficie shadow-tarjeta px-4 py-3 tipo-compacto text-texto">
      <span className="mt-[7px] flex">
        <EquipmentDot />
      </span>
      <span>
        {`Faltan equipos: ${flag.workingCount} ${typeEquipment(flag)} funcionando para ${flag.capacity} lugares. Baja su capacidad o revisa `}
        <TextLink asChild inline>
          <Link to="/estudio/equipos">Equipos</Link>
        </TextLink>
        .
      </span>
    </p>
  );
}

/**
 * Follow-up 170 §2, FIX-084: how many of the week's classes are short, in
 * one quiet line inside a white pill, never loose on the page 100
 * (follow-up 285, rule 3).
 */
export function EquipmentFlagsNotice({
  flags,
}: {
  flags: readonly EquipmentFlag[];
}) {
  if (flags.length === 0) return null;
  const text =
    flags.length === 1
      ? "1 clase con más lugares que equipos"
      : `${flags.length} clases con más lugares que equipos`;
  return (
    <p
      role="status"
      aria-label={text}
      className="flex items-center gap-2 self-start rounded-full bg-superficie px-3.5 py-2 tipo-compacto text-texto shadow-tarjeta"
    >
      <EquipmentDot />
      <span>
        {`${text} · `}
        <TextLink asChild inline>
          <Link to="/estudio/equipos">Revisar</Link>
        </TextLink>
      </span>
    </p>
  );
}
