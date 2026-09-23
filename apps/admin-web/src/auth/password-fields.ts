import { z } from "zod";

// The same rule the mobile apps apply; the backend stays authoritative.
export const newPasswordField = z.string().min(8, "Mínimo 8 caracteres.");

export const withMatchingConfirmation = <
  T extends z.ZodObject<{
    newPassword: z.ZodString;
    confirmPassword: z.ZodString;
  }>,
>(
  schema: T,
) =>
  schema.refine((values) => values.newPassword === values.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });
