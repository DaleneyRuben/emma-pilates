import { z } from "zod";
import {
  parseStoredPhone,
  phoneCountryByIso,
  phoneProblem,
  storedPhone,
} from "../../lib/phone-number";

/** What the «Celular» field holds: the country picked and the digits typed. */
export type PhoneValue = { iso: string; digits: string };

/** A stored number (or none) as the field starts: Bolivia when unknown. */
export const phoneValue = (stored?: string | null): PhoneValue => {
  const { country, digits } = parseStoredPhone(stored);
  return { iso: country.iso, digits };
};

const phoneValueSchema = z.object({ iso: z.string(), digits: z.string() });

/**
 * FIX-037: a required mobile of the chosen country (`phoneProblem`'s lines),
 * sent as «+<code> <digits>».
 */
export const requiredPhone = phoneValueSchema
  .superRefine((value, context) => {
    const problem = phoneProblem(phoneCountryByIso(value.iso), value.digits);
    if (problem !== null) {
      context.addIssue({ code: "custom", message: problem });
    }
  })
  .transform((value) =>
    storedPhone(phoneCountryByIso(value.iso), value.digits),
  );

/**
 * FIX-038 with FIX-037: an edit of a stored number. Left as it was (or still
 * empty when nothing was stored), the stored value goes back unchanged, even
 * one saved before the rule; any change must be a valid mobile.
 */
export const keptOrRequiredPhone = (stored: string | null) => {
  const start = phoneValue(stored);
  const untouched = (value: PhoneValue) =>
    value.iso === start.iso && value.digits === start.digits;
  return phoneValueSchema
    .superRefine((value, context) => {
      if (untouched(value)) return;
      const problem = phoneProblem(phoneCountryByIso(value.iso), value.digits);
      if (problem !== null) {
        context.addIssue({ code: "custom", message: problem });
      }
    })
    .transform((value) =>
      untouched(value)
        ? stored
        : storedPhone(phoneCountryByIso(value.iso), value.digits),
    );
};
