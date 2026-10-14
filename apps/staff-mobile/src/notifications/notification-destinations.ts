import type { AppRole } from "@pilates/mobile-core";

export type StaffRole = Exclude<AppRole, "client">;

export type StaffNotificationRoute =
  readonly ["Agenda"] | readonly ["Payments"] | readonly ["ReviewPayment", { paymentId: string }];

export function staffNotificationDestination(
  role: StaffRole,
  destinationType: string | null,
  destinationId: string | null,
): StaffNotificationRoute | null {
  return role === "trainer" && destinationType === destinationId ? null : null;
}
