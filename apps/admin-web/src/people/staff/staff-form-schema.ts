import { z } from "zod";
import { holdsEveryBranch, staffRoles, type StaffRole } from "../people-search";

const needsBranches = (role: unknown): boolean =>
  staffRoles.includes(role as StaffRole) && !holdsEveryBranch(role);

// AW24 with follow-ups 33 and 35: a required email (the login), an optional
// contact phone, exactly one Role, and Branches unless the Role is
// Administrator or Coordinator, who hold every Branch implicitly.
export const staffFormSchema = z
  .object({
    name: z.string().trim().min(1, "Escribe el nombre.").max(120),
    email: z.string().trim().pipe(z.email("Escribe un correo válido.")),
    phone: z
      .string()
      .trim()
      .max(40, "Hasta 40 caracteres.")
      .transform((phone) => (phone === "" ? null : phone)),
    role: z.enum(staffRoles, "Elige un rol."),
    branchIds: z.array(z.string()),
  })
  .refine(
    (values) => !needsBranches(values.role) || values.branchIds.length > 0,
    {
      path: ["branchIds"],
      message: "Elige al menos una sucursal.",
      // Say it together with the other fields' errors, not after them.
      when: ({ value }) =>
        needsBranches((value as { role?: unknown } | undefined)?.role),
    },
  );

export type StaffFormInput = z.input<typeof staffFormSchema>;
export type StaffFormOutput = z.output<typeof staffFormSchema>;

export const emptyStaffForm = (): StaffFormInput => ({
  name: "",
  email: "",
  phone: "",
  role: "" as StaffRole,
  branchIds: [],
});
