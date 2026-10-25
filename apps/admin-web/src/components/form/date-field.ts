import { z } from "zod";
import { boliviaToday } from "../../lib/bolivia-time";
import { parseCivilDate } from "./civil-date";

const isoDate = (required: string) =>
  z.string().refine((value) => parseCivilDate(value) !== null, required);

/**
 * A Bolivia civil date (`YYYY-MM-DD`) no later than today in Bolivia
 * (BKO-001 Q2); today is read when the form validates. Text that is not a
 * real date stays in the field and is refused here.
 */
export const pastCivilDateField = (required: string) =>
  isoDate(required)
    .transform((value) => parseCivilDate(value) ?? "")
    .refine(
      (date) => date <= boliviaToday(),
      "La fecha no puede ser posterior a hoy.",
    );

/** A Bolivia civil date with no bound: a display window may start later. */
export const civilDateField = (required: string) =>
  isoDate(required).transform((value) => parseCivilDate(value) ?? "");
