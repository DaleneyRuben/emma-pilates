/**
 * E8 (ADR-0111): where «Mis pagos» lives for a Role. The Trainer, the
 * Coordinator and the Nutritionist get a tab; the Assistant, whose bar is
 * full, gets rows in Perfil; the Administrator pays and is not paid here.
 *
 * A Staff Member holds one Role today. The API reads her pay by Staff
 * Member, not by Role, so a person with several Roles would still see one
 * list; give her the tab when any of her Roles has one.
 */
export type PayPlacement = "tab" | "profile" | "none";

export function payPlacement(roles: string | readonly string[] | undefined): PayPlacement {
  const held = roles === undefined ? [] : typeof roles === "string" ? [roles] : roles;
  if (held.some((role) => role === "trainer" || role === "coordinator" || role === "nutritionist"))
    return "tab";
  if (held.includes("assistant")) return "profile";
  return "none";
}
