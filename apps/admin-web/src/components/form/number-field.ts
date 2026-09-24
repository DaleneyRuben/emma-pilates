import { z } from "zod";

/**
 * A whole number typed into a text field: the form keeps the text the
 * Administrator typed and submits the integer (ADR-0041 conversion).
 */
export const wholeNumberField = (min: number, max: number, message: string) =>
  z
    .string()
    .trim()
    .regex(/^\d+$/, message)
    .transform(Number)
    .pipe(z.number().int().min(min, message).max(max, message));
