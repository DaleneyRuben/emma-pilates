import { z } from "zod";
import { formatBolivianos, parseBolivianos } from "../../lib/money";

/**
 * A Money Amount typed as `1.050,00` (or `1050.50`): the form keeps the text
 * and submits positive integer centavos (ADR-0082).
 */
export const bolivianosField = (messages: { invalid: string; zero: string }) =>
  z
    .string()
    .transform((text) => parseBolivianos(text))
    .pipe(z.number(messages.invalid).int().min(1, messages.zero));

/** An amount as the Administrator would type it back, without "Bs". */
export const bolivianosText = (centavos: number): string =>
  formatBolivianos(centavos).replace(/^Bs\s/, "");
