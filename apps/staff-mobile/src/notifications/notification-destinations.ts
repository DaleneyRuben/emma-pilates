import type { AppRole } from "@pilates/mobile-core";

export type StaffRole = Exclude<AppRole, "client">;

export type StaffNotificationRoute =
  | readonly ["Agenda"]
  | readonly ["Payments"]
  | readonly ["ReviewPayment", { paymentId: string }]
  | readonly ["Freezes"]
  | readonly ["ReviewFreeze", { freezeId: string }];

// The one map from a notification's destination to a Staff screen, shared by
// the inbox and push taps (NOT-002). Mi agenda is the root of the Trainer and
// Nutritionist stacks; the Administrator reviews a submitted payment.
export function staffNotificationDestination(
  role: StaffRole,
  destinationType: string | null,
  destinationId: string | null,
): StaffNotificationRoute | null {
  if (
    (role === "trainer" && destinationType === "trainer_schedule") ||
    (role === "nutritionist" && destinationType === "nutritionist_agenda")
  ) {
    return ["Agenda"];
  }
  if (role === "administrator" && destinationType === "payment") {
    return destinationId === null ? ["Payments"] : ["ReviewPayment", { paymentId: destinationId }];
  }
  if (role === "administrator" && destinationType === "freeze") {
    return destinationId === null ? ["Freezes"] : ["ReviewFreeze", { freezeId: destinationId }];
  }
  return null;
}
