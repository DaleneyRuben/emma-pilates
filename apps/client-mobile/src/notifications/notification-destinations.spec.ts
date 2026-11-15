import { clientNotificationDestination } from "./notification-destinations";

describe("clientNotificationDestination", () => {
  it.each([
    ["subscription", ["ProfileTab", { screen: "Subscription" }]],
    ["evaluation", ["ProfileTab", { screen: "MyEvaluations" }]],
    ["payment", ["ProfileTab", { screen: "PaymentStatus" }]],
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
