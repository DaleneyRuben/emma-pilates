import { z } from "zod";
import { holdsEveryBranch, staffRoles, type StaffRole } from "../people-search";

const needsBranches = (role: unknown): boolean =>
  staffRoles.includes(role as StaffRole) && !holdsEveryBranch(role);

// FIX-030 with MOB-070 and decision §19.20 (owner, 2026-11-04): a member's
// phone is a Bolivian mobile, 8 digits starting with 6 or 7. The +591 is
// implicit: typed or not, it is sent as «+591 XXXXXXXX», as the backend
// stores it (`mobile-core`'s `bolivian-mobile.ts` has the same rule for the
// apps). FIX-038: «Editar» lets the Administrator change it, and a phone saved
// before the rule (`kept`) is kept exactly as it is: it never blocks «Guardar»
// and is never rewritten by a save that does not touch it.
const anyPhone = z.string().trim().max(40, "Hasta 40 caracteres.");
const mobilePattern = /^(?:\+?591[\s-]*)?([67](?:[\s-]?\d){7})$/;
const bolivianMobile = (kept = "") =>
  anyPhone
    .refine(
      (phone) => phone === "" || phone === kept || mobilePattern.test(phone),
      "Escribe un celular de Bolivia de 8 dígitos, por ejemplo 71234567.",
    )
    .transform((phone) => {
      if (kept !== "" && phone === kept) return kept;
      const digits = mobilePattern.exec(phone)?.[1];
      return digits === undefined ? phone : `+591 ${digits.replace(/\D/g, "")}`;
    });

// AW24 with follow-ups 33 and 35: a required email (the login), an optional
// contact phone, exactly one Role, and Branches unless the Role is
// Administrator or Coordinator, who hold every Branch implicitly.
const staffSchema = (phone: z.ZodType<string, string>) =>
  z
    .object({
      name: z.string().trim().min(1, "Escribe el nombre.").max(120),
      email: z.string().trim().pipe(z.email("Escribe un correo válido.")),
      phone: phone.transform((value) => (value === "" ? null : value)),
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

export const staffCreateSchema = staffSchema(bolivianMobile());
export const staffEditSchema = (storedPhone: string | null) =>
  staffSchema(bolivianMobile(storedPhone ?? ""));

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
  phone: "",
  role: "" as StaffRole,
  branchIds: [],
});
