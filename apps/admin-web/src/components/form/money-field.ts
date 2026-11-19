import { z } from "zod";
import { parseBolivianos } from "../../lib/money";

/**
 * A Money Amount typed as `1.050,00` (or `1050.50`): the form keeps the text
 * and submits positive integer centavos (ADR-0082).
 */
export const bolivianosField = (messages: { invalid: string; zero: string }) =>
  z
    .string()
    .transform((text) => parseBolivianos(text))
    .pipe(z.number(messages.invalid).int().min(1, messages.zero));

const editable = new Intl.NumberFormat("es-BO", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: "always",
});

/** An amount to edit, as the Administrator would type it: «1.050,00». */
export const bolivianosText = (centavos: number): string =>
  editable.format(centavos / 100);
