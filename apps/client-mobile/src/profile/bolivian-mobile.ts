import { z } from "zod";

// A Bolivian mobile is 8 digits starting with 7, written with the +591 the
// studio already stores. Spacing is kept: the API trims and saves as typed.
const bolivianMobile = /^\+591[\s-]*7(?:[\s-]?\d){7}$/;

export const bolivianMobileSchema = z.string().refine((value) => {
  const trimmed = value.trim();
  return trimmed === "" || bolivianMobile.test(trimmed);
}, "Escribe un celular de Bolivia, por ejemplo +591 71234567.");
