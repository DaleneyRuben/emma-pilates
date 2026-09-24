import { z } from "zod";
import { boliviaToday } from "../../lib/bolivia-time";

/**
 * A Bolivia civil date (`YYYY-MM-DD`, as a date input gives it) no later than
 * today in Bolivia (BKO-001 Q2); today is read when the form validates.
 */
export const pastCivilDateField = (required: string) =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, required)
    .refine(
      (date) => date <= boliviaToday(),
      "La fecha no puede ser posterior a hoy.",
    );

/** A Bolivia civil date with no bound: a display window may start later. */
export const civilDateField = (required: string) =>
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, required);
