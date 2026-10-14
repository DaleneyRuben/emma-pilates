export type ClientNotificationRoute =
  | readonly ["ProfileTab", { screen: "Subscription" | "MyEvaluations" | "PaymentStatus" }]
  | readonly ["Bookings", { screen: "MyBookings" }];

export function clientNotificationDestination(
  destinationType: string | null,
): ClientNotificationRoute | null {
  return destinationType === "" ? null : null;
}
