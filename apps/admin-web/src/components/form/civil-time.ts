import { z } from "zod";

const displayTime = /^(\d{2}):(\d{2})$/;

/** `HH:mm` for a real 24-hour clock, or null when it is not one. */
export function parseCivilTime(text: string): string | null {
  const match = displayTime.exec(text);
  if (match === null) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return `${match[1]}:${match[2]}`;
}

/** A wall clock the form may submit: empty, or `HH:mm`. */
export const civilTimeValue = z
  .string()
  .refine(
    (value) => value === "" || parseCivilTime(value) !== null,
    "Elige una hora válida.",
  );

/**
 * Groups digits as `HH:mm` while the Administrator types. A colon already
 * typed is kept, so backspace can remove it.
 */
export function maskCivilTime(text: string): string {
  const digits = text.replace(/\D/g, "").slice(0, 4);
  const colonKept = text.includes(":") && digits.length >= 2;
  const hour = digits.slice(0, 2);
  const minute = digits.slice(2, 4);
  if (minute === "" && !colonKept) return hour;
  return `${hour}:${minute}`;
}
