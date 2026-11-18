// FIX-081 (walkthrough finding 118): the one place a Staff Member's Role
// becomes words, in her gender. Used by the admin web, the Staff app and the
// Client app wherever a Role is shown: «Coordinadora» or «Coordinador»,
// «Administradora» or «Administrador». Asistente and Nutricionista read the
// same for both. Without a gender (an older API, a filter over everyone),
// the feminine form the labels always used.
export type StaffRoleCode =
  "trainer" | "nutritionist" | "assistant" | "administrator" | "coordinator";
export type StaffGenderCode = "female" | "male";

const labels: Record<StaffRoleCode, Record<StaffGenderCode, string>> = {
  trainer: { female: "Entrenadora", male: "Entrenador" },
  nutritionist: { female: "Nutricionista", male: "Nutricionista" },
  assistant: { female: "Asistente", male: "Asistente" },
  administrator: { female: "Administradora", male: "Administrador" },
  coordinator: { female: "Coordinadora", male: "Coordinador" },
};

export const staffRoleLabel = (
  role: StaffRoleCode,
  gender: StaffGenderCode | null | undefined = "female",
): string => labels[role][gender ?? "female"];

/** «Género»'s choices, in the order the forms show them. */
export const staffGenderOptions: readonly (readonly [
  StaffGenderCode,
  string,
])[] = [
  ["female", "Femenino"],
  ["male", "Masculino"],
];
