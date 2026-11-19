import { formatListDate } from "@pilates/api-contracts";

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? "";
}

/** «dom 8 feb»: FIX-090's list date, also inside a sentence («vence el dom 8 feb»). */
export function formatCivilDate(civilDate: string): string {
  return formatListDate(civilDate);
}

export function evaluationShortcut(nextStartsAt: string | undefined): string {
  return nextStartsAt === undefined
    ? "Agenda tu cita del mes"
    : `Próxima: ${formatListDate(nextStartsAt)}`;
}

// BKM-014: the reward is one class, not credit. The count still names the tile.
export function referralShortcut(count: number | undefined): string {
  if (count === undefined || count === 0) return "Invita a una amiga a una clase gratis";
  return count === 1 ? "1 amiga invitada" : `${count} amigas invitadas`;
}

export function describeAllowance(remaining: number, original: number): string {
  return `${remaining} de ${original} clases`;
}
