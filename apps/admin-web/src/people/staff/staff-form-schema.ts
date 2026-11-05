import { z } from "zod";
import {
  keptOrRequiredPhone,
  phoneValue,
  requiredPhone,
  type PhoneValue,
} from "../../components/form/phone-value";
import { holdsEveryBranch, staffRoles, type StaffRole } from "../people-search";

const needsBranches = (role: unknown): boolean =>
  staffRoles.includes(role as StaffRole) && !holdsEveryBranch(role);

// AW24 with follow-ups 33 and 35: a required email (the login), a contact
// mobile, exactly one Role, and Branches unless the Role is Administrator or
// Coordinator, who hold every Branch implicitly. FIX-037 (follow-up 236): a
// new member's «Celular» is required and may be from any country
// (`phoneProblem`'s rule, Bolivia's §19.20 included), sent as «+<code>
// <digits>». FIX-038: «Editar» lets the Administrator change it with the same
// field; a phone saved before the rule is kept exactly as it is when the
// field is left untouched, so it never blocks «Guardar» and is never
// rewritten by a save that does not change it.
const staffSchema = (phone: z.ZodType<string | null, PhoneValue>) =>
  z
    .object({
      name: z.string().trim().min(1, "Escribe el nombre.").max(120),
      email: z.string().trim().pipe(z.email("Escribe un correo válido.")),
      phone,
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

export const staffCreateSchema = staffSchema(requiredPhone);
export const staffEditSchema = (stored: string | null) =>
  staffSchema(keptOrRequiredPhone(stored));

// Decision 6: the Coordinator's form shows a Trainer's Branches only, so it
// validates nothing else; a stored contact never blocks «Guardar».
export const trainerBranchesSchema = z.object({
  branchIds: z.array(z.string()).min(1, "Elige al menos una sucursal."),
});

export type TrainerBranchesInput = z.input<typeof trainerBranchesSchema>;
export type StaffFormInput = z.input<typeof staffCreateSchema>;
export type StaffFormOutput = z.output<typeof staffCreateSchema>;

export const emptyStaffForm = (): StaffFormInput => ({
  name: "",
  email: "",
  phone: phoneValue(),
  role: "" as StaffRole,
  branchIds: [],
});
