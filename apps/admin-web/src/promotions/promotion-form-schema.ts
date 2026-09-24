import { z } from "zod";
import { civilDateField } from "../components/form/date-field";

// The backend's copy limits (UPL-002: 80 and 280 characters after trimming)
// and an inclusive window whose end is never before its start.
export const promotionSchema = z
  .object({
    headline: z
      .string()
      .trim()
      .min(1, "Escribe el título.")
      .max(80, "Escribe hasta 80 caracteres."),
    description: z
      .string()
      .trim()
      .min(1, "Escribe la descripción.")
      .max(280, "Escribe hasta 280 caracteres."),
    displayStartsOn: civilDateField("Elige la fecha de inicio."),
    displayEndsOn: civilDateField("Elige la fecha de fin."),
  })
  .refine((values) => values.displayEndsOn >= values.displayStartsOn, {
    path: ["displayEndsOn"],
    message: "La fecha de fin no puede ser anterior a la de inicio.",
  });

export type PromotionInput = z.input<typeof promotionSchema>;
export type PromotionOutput = z.output<typeof promotionSchema>;

/** AW18 edit mode says whether today falls inside the display window. */
export const windowStatus = (
  today: string,
  startsOn: string,
  endsOn: string,
): string =>
  today >= startsOn && today <= endsOn
    ? "Se está mostrando ahora: hoy está dentro del rango."
    : "Hoy está fuera del rango: se guarda pero no se muestra.";

/** Follow-up 39: a changed or removed image unpublishes on save. */
export const imageChangeWarning = (hasImage: boolean): string =>
  hasImage
    ? "Al cambiar la imagen, la promoción deja de publicarse al guardar; publícala de nuevo cuando la nueva imagen esté lista."
    : "Sin imagen, la promoción deja de publicarse al guardar; publícala de nuevo cuando subas otra.";
