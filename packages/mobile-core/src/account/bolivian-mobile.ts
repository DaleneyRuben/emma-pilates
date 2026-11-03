import { z } from "zod";

// A Bolivian mobile is 8 digits starting with 7, written with the +591 the
// studio already stores. Spacing is kept: the API trims and saves as typed.
const bolivianMobile = /^\+591[\s-]*7(?:[\s-]?\d){7}$/;

export const bolivianMobileMessage = "Escribe un celular de Bolivia, por ejemplo +591 71234567.";

/** Blank (no phone) or a Bolivian mobile (MOB-070, FIX-030). */
export const isBolivianMobileOrBlank = (value: string): boolean => {
  const trimmed = value.trim();
  return trimmed === "" || bolivianMobile.test(trimmed);
};

export const bolivianMobileSchema = z
  .string()
  .refine(isBolivianMobileOrBlank, bolivianMobileMessage);
