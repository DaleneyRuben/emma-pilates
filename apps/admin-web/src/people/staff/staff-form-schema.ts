import { z } from "zod";
import { holdsEveryBranch, staffRoles, type StaffRole } from "../people-search";

const needsBranches = (role: unknown): boolean =>
  staffRoles.includes(role as StaffRole) && !holdsEveryBranch(role);

// FIX-030 with MOB-070: a new member's phone is a Bolivian mobile, 8 digits
// starting with 7 after +591. «Editar» shows the stored phone read-only, so it
// accepts whatever was saved before the rule.
const anyPhone = z.string().trim().max(40, "Hasta 40 caracteres.");
const bolivianMobile = anyPhone.refine(
  (phone) => phone === "" || /^\+591[\s-]*7(?:[\s-]?\d){7}$/.test(phone),
  "Escribe un celular de Bolivia, por ejemplo +591 71234567.",
);

// AW24 with follow-ups 33 and 35: a required email (the login), an optional
// contact phone, exactly one Role, and Branches unless the Role is
// Administrator or Coordinator, who hold every Branch implicitly.
const staffSchema = (phone: typeof anyPhone) =>
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

export const staffCreateSchema = staffSchema(bolivianMobile);
export const staffFormSchema = staffSchema(anyPhone);

// Decision 6: the Coordinator's form shows a Trainer's Branches only, so it
// validates nothing else; a stored contact never blocks «Guardar».
export const trainerBranchesSchema = z.object({
  branchIds: z.array(z.string()).min(1, "Elige al menos una sucursal."),
});

export type TrainerBranchesInput = z.input<typeof trainerBranchesSchema>;
export type StaffFormInput = z.input<typeof staffFormSchema>;
export type StaffFormOutput = z.output<typeof staffFormSchema>;

export const emptyStaffForm = (): StaffFormInput => ({
  name: "",
  email: "",
  phone: "",
  role: "" as StaffRole,
  branchIds: [],
});
