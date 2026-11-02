import type { AppRole } from "@pilates/mobile-core";

export type StaffRole = Exclude<AppRole, "client">;

// Each role has a tab bar (follow-up 225 §8), so a destination names the tab
// and the screen inside its stack.
export type StaffNotificationRoute =
  | readonly ["AgendaTab", { screen: "Agenda" }]
  | readonly ["ClientsTab", { screen: "ClientOverview"; params: { clientId: string } }]
  | readonly ["PaymentsTab", { screen: "Payments" }]
  | readonly ["PaymentsTab", { screen: "ReviewPayment"; params: { paymentId: string } }]
  | readonly ["PaymentsTab", { screen: "Freezes" }]
  | readonly ["PaymentsTab", { screen: "ReviewFreeze"; params: { freezeId: string } }];

// The one map from a notification's destination to a Staff screen, shared by
// the inbox and push taps (NOT-002). Mi agenda is the first tab of the Trainer
// and the Nutritionist; the Administrator reviews a submitted payment; the
// Assistant opens the named Client.
export function staffNotificationDestination(
  role: StaffRole,
  destinationType: string | null,
  destinationId: string | null,
): StaffNotificationRoute | null {
  if (
    (role === "trainer" && destinationType === "trainer_schedule") ||
    (role === "nutritionist" && destinationType === "nutritionist_agenda")
  ) {
    return ["AgendaTab", { screen: "Agenda" }];
  }
  if (role === "administrator" && destinationType === "payment") {
    return destinationId === null
      ? ["PaymentsTab", { screen: "Payments" }]
      : ["PaymentsTab", { screen: "ReviewPayment", params: { paymentId: destinationId } }];
  }
  if (role === "assistant" && destinationType === "client" && destinationId !== null) {
    return ["ClientsTab", { screen: "ClientOverview", params: { clientId: destinationId } }];
  }
  if (role === "administrator" && destinationType === "freeze") {
    return destinationId === null
      ? ["PaymentsTab", { screen: "Freezes" }]
      : ["PaymentsTab", { screen: "ReviewFreeze", params: { freezeId: destinationId } }];
  }
  return null;
}
