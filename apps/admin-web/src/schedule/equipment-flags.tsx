import { Link } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";
import { kindPlurals, type EquipmentFlag } from "./equipment-flag-data";

/** Follow-up 170 §1: the warning line inside a flagged Session block. */
export function EquipmentFlagLine({ flag }: { flag: EquipmentFlag }) {
  return (
    <span className="flex w-full items-center gap-1 truncate text-ayuda text-advertencia-texto tabular">
      <TriangleAlert size={12} strokeWidth={1.8} aria-hidden="true" />
      <span>Faltan equipos</span>
      <span>{` · ${flag.workingCount} de ${flag.capacity}`}</span>
    </span>
  );
}

/** Follow-up 170 §2: how many of the week's Sessions are short. */
export function EquipmentFlagsNotice({
  flags,
}: {
  flags: readonly EquipmentFlag[];
}) {
  if (flags.length === 0) return null;
  const kinds = new Set(flags.map((flag) => flag.kind));
  const what = kinds.size === 1 ? kindPlurals[flags[0]!.kind] : "equipos";
  const count =
    flags.length === 1
      ? "1 sesión de esta semana tiene"
      : `${flags.length} sesiones de esta semana tienen`;
  return (
    <p
      role="status"
      className="rounded-control border border-advertencia/40 bg-advertencia/10 px-3 py-2 text-nota text-advertencia-texto"
    >
      {`${count} más lugares que ${what} funcionando. Baja su capacidad o revisa `}
      <Link
        to="/back-office/equipos"
        className="font-medium text-primario-profundo underline-offset-2 hover:underline"
      >
        Equipos
      </Link>
      .
    </p>
  );
}
