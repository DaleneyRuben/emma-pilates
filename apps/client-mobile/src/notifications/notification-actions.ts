import type { NotificationDto } from "@pilates/api-contracts";

export type ClientNotificationActionRoute =
  | readonly ["Booking", { screen: "Browse" }]
  | readonly ["Bookings", { screen: "MyBookings" }]
  | readonly [
      "ProfileTab",
      {
        screen:
          "EvaluationAvailability" | "MyInvoices" | "PaymentStatus" | "Plans" | "Subscription";
      },
    ]
  | readonly ["ProfileTab", { screen: "InvoiceDetail"; params: { paymentId: string } }];

export type ClientNotificationAction = { label: string; route: ClientNotificationActionRoute };

type Notice = Pick<NotificationDto, "type" | "destinationType" | "destinationId">;

const book = { label: "Reservar una clase", route: ["Booking", { screen: "Browse" }] } as const;
const myBookings = {
  label: "Ver mis reservas",
  route: ["Bookings", { screen: "MyBookings" }],
} as const;
const myEvaluation = {
  label: "Ver mi evaluación",
  route: ["ProfileTab", { screen: "EvaluationAvailability" }],
} as const;
const anotherSlot = { ...myEvaluation, label: "Elegir otro horario" };
const plans = { label: "Ver planes", route: ["ProfileTab", { screen: "Plans" }] } as const;
const myPlan = { label: "Ver mi plan", route: ["ProfileTab", { screen: "Subscription" }] } as const;

const byType: Readonly<Record<string, (notice: Notice) => ClientNotificationAction>> = {
  // An evaluation's payment notices belong to the evaluation, not the plan.
  payment_confirmed: ({ destinationType }) =>
    destinationType === "evaluation" ? myEvaluation : book,
  payment_rejected: ({ destinationType }) =>
    destinationType === "evaluation"
      ? myEvaluation
      : { label: "Ver mi pago", route: ["ProfileTab", { screen: "PaymentStatus" }] },
  invoice_ready: ({ destinationId }) => ({
    label: "Ver factura",
    route:
      destinationId === null || destinationId === undefined
        ? ["ProfileTab", { screen: "MyInvoices" }]
        : ["ProfileTab", { screen: "InvoiceDetail", params: { paymentId: destinationId } }],
  }),
  freeze_approved: () => myPlan,
  freeze_refused: () => myPlan,
  subscription_expiring: () => ({ ...plans, label: "Renovar mi plan" }),
  founder_membership_lost: () => plans,
  session_cancelled: () => ({ ...book, label: "Reservar otra clase" }),
  session_rescheduled_by_studio: () => myBookings,
  waitlist_promoted: () => myBookings,
  class_reminder_day: () => myBookings,
  class_reminder_hour: () => myBookings,
  evaluation_cancelled_by_studio: () => anotherSlot,
  evaluation_reschedule_required: () => anotherSlot,
  evaluation_reminder_day: () => myEvaluation,
  evaluation_reminder_hour: () => myEvaluation,
  lifecycle_day_2: () => book,
  lifecycle_day_90: () => plans,
};

/**
 * C2 C (owner 2026-11-19): the direct action under a Client notice, on a
 * screen the Client app has; a notice with nothing sensible to do has none.
 */
export function clientNotificationAction(notice: Notice): ClientNotificationAction | null {
  if (!Object.hasOwn(byType, notice.type)) return null;
  const { label, route } = byType[notice.type](notice);
  // Walkthrough n.º 55: React Navigation applies a params object only once,
  // so each notice gets its own copy.
  return { label, route: [route[0], { ...route[1] }] as ClientNotificationActionRoute };
}
