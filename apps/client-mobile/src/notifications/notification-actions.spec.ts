import { clientNotificationAction } from "./notification-actions";

function notice(type: string, destinationType: string | null = null, destinationId?: string) {
  return { type, destinationType, destinationId: destinationId ?? null };
}

// C2 C (owner 2026-11-19): each notice's direct action on a Client screen.
describe("clientNotificationAction", () => {
  it.each([
    [
      notice("payment_confirmed", "subscription"),
      "Reservar una clase",
      ["Booking", { screen: "Browse" }],
    ],
    [
      notice("payment_confirmed", "evaluation"),
      "Ver mi evaluación",
      ["ProfileTab", { screen: "EvaluationAvailability" }],
    ],
    [
      notice("payment_rejected", "payment"),
      "Ver mi pago",
      ["ProfileTab", { screen: "PaymentStatus" }],
    ],
    [
      notice("payment_rejected", "evaluation"),
      "Ver mi evaluación",
      ["ProfileTab", { screen: "EvaluationAvailability" }],
    ],
    [
      notice("invoice_ready", "invoice", "payment-1"),
      "Ver factura",
      ["ProfileTab", { screen: "InvoiceDetail", params: { paymentId: "payment-1" } }],
    ],
    [notice("invoice_ready", "invoice"), "Ver factura", ["ProfileTab", { screen: "MyInvoices" }]],
    [notice("freeze_approved"), "Ver mi plan", ["ProfileTab", { screen: "Subscription" }]],
    [notice("freeze_refused"), "Ver mi plan", ["ProfileTab", { screen: "Subscription" }]],
    [notice("subscription_expiring"), "Renovar mi plan", ["ProfileTab", { screen: "Plans" }]],
    [notice("founder_membership_lost"), "Ver planes", ["ProfileTab", { screen: "Plans" }]],
    [notice("session_cancelled"), "Reservar otra clase", ["Booking", { screen: "Browse" }]],
    [
      notice("session_rescheduled_by_studio"),
      "Ver mis reservas",
      ["Bookings", { screen: "MyBookings" }],
    ],
    [notice("waitlist_promoted"), "Ver mis reservas", ["Bookings", { screen: "MyBookings" }]],
    [notice("class_reminder_day"), "Ver mis reservas", ["Bookings", { screen: "MyBookings" }]],
    [notice("class_reminder_hour"), "Ver mis reservas", ["Bookings", { screen: "MyBookings" }]],
    [
      notice("evaluation_cancelled_by_studio"),
      "Elegir otro horario",
      ["ProfileTab", { screen: "EvaluationAvailability" }],
    ],
    [
      notice("evaluation_reschedule_required"),
      "Elegir otro horario",
      ["ProfileTab", { screen: "EvaluationAvailability" }],
    ],
    [
      notice("evaluation_reminder_day"),
      "Ver mi evaluación",
      ["ProfileTab", { screen: "EvaluationAvailability" }],
    ],
    [
      notice("evaluation_reminder_hour"),
      "Ver mi evaluación",
      ["ProfileTab", { screen: "EvaluationAvailability" }],
    ],
    [notice("lifecycle_day_2"), "Reservar una clase", ["Booking", { screen: "Browse" }]],
    [notice("lifecycle_day_90"), "Ver planes", ["ProfileTab", { screen: "Plans" }]],
  ])("offers %o as «%s»", (notification, label, route) => {
    expect(clientNotificationAction(notification)).toEqual({ label, route });
  });

  it.each(["lifecycle_week_1", "lifecycle_day_30", "session_assigned", "unknown"])(
    "offers no action for %s",
    (type) => {
      expect(clientNotificationAction(notice(type))).toBeNull();
    },
  );

  // Walkthrough n.º 55: React Navigation applies a params object once.
  it("gives each notice its own params", () => {
    const first = clientNotificationAction(notice("freeze_approved"));
    const second = clientNotificationAction(notice("freeze_approved"));

    expect(second?.route[1]).toEqual(first?.route[1]);
    expect(second?.route[1]).not.toBe(first?.route[1]);
  });
});
