import { z } from "zod";
import { formatCivilDate } from "../../lib/bolivia-time";

const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/;
const displayDate = /^(\d{2})\/(\d{2})\/(\d{4})$/;

const isCalendarDate = (year: number, month: number, day: number): boolean => {
  if (month < 1 || month > 12 || day < 1) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

/** `YYYY-MM-DD` for a real `dd/mm/aaaa` or an already stored date, else null. */
export function parseCivilDate(text: string): string | null {
  const iso = isoDate.exec(text);
  if (iso !== null) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    return isCalendarDate(year, month, day) ? text : null;
  }
  const match = displayDate.exec(text);
  if (match === null) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (!isCalendarDate(year, month, day)) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

/** `dd/mm/aaaa` for a stored civil date; anything else stays as typed. */
export function displayCivilDate(value: string): string {
  return isoDate.test(value) ? formatCivilDate(value) : value;
}

/** A civil date the form may submit: empty, or `YYYY-MM-DD`. */
export const civilDateValue = z
  .string()
  .refine(
    (value) => value === "" || parseCivilDate(value) !== null,
    "Elige una fecha válida.",
  )
  .transform((value) => (value === "" ? "" : (parseCivilDate(value) ?? "")));

/**
 * A year typed first (`2026-10-21`, one character at a time or pasted) is
 * the ISO shape a native date input used to give. It stays until it is a
 * whole date, then shows as `dd/mm/aaaa`. Digits typed day first group as
 * `dd/mm/aaaa`; a slash already typed is kept, so backspace can remove it.
 */
const looksLikeIso = (text: string): boolean =>
  /^\d{0,4}(-\d{0,2}){0,2}$/.test(text);

export function maskCivilDate(text: string): string {
  const iso = isoDate.exec(text);
  if (iso !== null) return formatCivilDate(text);
  if (looksLikeIso(text)) return text;
  const digits = text.replace(/\D/g, "").slice(0, 8);
  const slashAt = (index: number) =>
    text.includes("/") && text.replace(/\D/g, "").length >= index;
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  return [
    day,
    month === "" && !slashAt(2) ? "" : `/${month}`,
    year === "" && !slashAt(4) ? "" : `/${year}`,
  ].join("");
}
