export type ClientNotificationRoute =
  | readonly ["ProfileTab", { screen: "Subscription" | "MyEvaluations" | "PaymentStatus" }]
  | readonly ["Bookings", { screen: "MyBookings" }];

const routes: Readonly<Record<string, ClientNotificationRoute>> = {
  subscription: ["ProfileTab", { screen: "Subscription" }],
  evaluation: ["ProfileTab", { screen: "MyEvaluations" }],
  payment: ["ProfileTab", { screen: "PaymentStatus" }],
  booking: ["Bookings", { screen: "MyBookings" }],
  // A cancelled Session has no detail to open; its Bookings do.
  session: ["Bookings", { screen: "MyBookings" }],
};

// The one map from a notification's destination to a Client screen, shared by
// the inbox and push taps (NOT-002).
export function clientNotificationDestination(
  destinationType: string | null,
): ClientNotificationRoute | null {
  return destinationType !== null && Object.hasOwn(routes, destinationType)
    ? routes[destinationType]
    : null;
}
