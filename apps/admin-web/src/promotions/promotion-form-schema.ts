import { z } from "zod";
import { civilDateValue } from "../components/form/civil-date";
import { civilDateField } from "../components/form/date-field";

/**
 * «Guardar borrador» keeps a private draft, so its dates may stay empty
 * (finding 82, follow-up 266); «Publicar» and «Guardar cambios» on a
 * published Promotion need both. A typed date must be real either way.
 */
export type PromotionSaveMode = "draft" | "publish";

const optionalDate = civilDateValue.transform((date) =>
  date === "" ? null : date,
);

const dateFor = (mode: PromotionSaveMode, required: string) =>
  mode === "publish" ? civilDateField(required) : optionalDate;

// The backend's copy limits (UPL-002: 80 and 280 characters after trimming)
// and an inclusive window whose end is never before its start.
export const promotionSchemaFor = (mode: PromotionSaveMode) =>
  z
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
      displayStartsOn: dateFor(mode, "Elige la fecha de inicio."),
      displayEndsOn: dateFor(mode, "Elige la fecha de fin."),
    })
    .refine(
      ({ displayStartsOn: start, displayEndsOn: end }) =>
        start === null || end === null || end >= start,
      {
        path: ["displayEndsOn"],
        message: "La fecha de fin no puede ser anterior a la de inicio.",
      },
    );

export const promotionSchema = promotionSchemaFor("draft");

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
