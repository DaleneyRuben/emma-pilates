import { clientNotificationDestination } from "./notification-destinations";

describe("clientNotificationDestination", () => {
  // FIX-090 (states review Y8): a Perfil screen opens over Perfil, so its
  // stack can go back, and «Volver al inicio» pops to Perfil instead of
  // raising «POP_TO_TOP was not handled».
  it.each([
    ["subscription", ["ProfileTab", { screen: "Subscription", initial: false }]],
    ["evaluation", ["ProfileTab", { screen: "EvaluationAvailability", initial: false }]],
    ["payment", ["ProfileTab", { screen: "PaymentStatus", initial: false }]],
    ["invoice", ["ProfileTab", { screen: "MyInvoices", initial: false }]],
    ["booking", ["Bookings", { screen: "MyBookings" }]],
    // A cancelled Session has no detail to open; its Bookings do.
    ["session", ["Bookings", { screen: "MyBookings" }]],
  ])("opens %s where the inbox does", (destinationType, route) => {
    expect(clientNotificationDestination(destinationType)).toEqual(route);
  });

  it.each([null, "trainer_schedule", "unknown"])("opens nothing for %s", (destinationType) => {
    expect(clientNotificationDestination(destinationType)).toBeNull();
  });

  // Walkthrough n.º 55: React Navigation applies a params object once, so a
  // second notification to the same screen needs params of its own.
  it("gives each notification its own params", () => {
    const [, first] = clientNotificationDestination("subscription")!;
    const [, second] = clientNotificationDestination("subscription")!;

    expect(second).toEqual(first);
    expect(second).not.toBe(first);
  });
});
