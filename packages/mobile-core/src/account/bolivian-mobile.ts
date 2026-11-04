import { z } from "zod";

// MOB-070 with decision §19.20 (owner, 2026-11-04): a Bolivian mobile is 8
// digits starting with 6 or 7. The +591 is implicit: typed or not, with
// spaces or dashes, the phone is sent as «+591 XXXXXXXX», as the backend
// stores it. The admin web keeps the same rule in `staff-form-schema.ts`.
const bolivianMobile = /^(?:\+?591[\s-]*)?([67](?:[\s-]?\d){7})$/;

export const bolivianMobileMessage =
  "Escribe un celular de Bolivia de 8 dígitos, por ejemplo 71234567.";

/** Blank (no phone) or a Bolivian mobile (MOB-070, FIX-030). */
export const isBolivianMobileOrBlank = (value: string): boolean => {
  const trimmed = value.trim();
  return trimmed === "" || bolivianMobile.test(trimmed);
};

/** «+591 XXXXXXXX» for a Bolivian mobile, "" for a blank, else as typed. */
export const normalizeBolivianMobile = (value: string): string => {
  const trimmed = value.trim();
  const match = bolivianMobile.exec(trimmed);
  return match === null ? trimmed : `+591 ${match[1].replace(/\D/g, "")}`;
};

export const bolivianMobileSchema = z
  .string()
  .refine(isBolivianMobileOrBlank, bolivianMobileMessage)
  .transform(normalizeBolivianMobile);
