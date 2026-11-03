import { staffNotificationDestination } from "./notification-destinations";

const paymentId = "22222222-2222-4222-8222-222222222222";
const clientId = "33333333-3333-4333-8333-333333333333";

describe("staffNotificationDestination", () => {
  it("opens Mi agenda for the Trainer's and Nutritionist's schedule notices", () => {
    expect(staffNotificationDestination("trainer", "trainer_schedule", null)).toEqual([
      "AgendaTab",
      { screen: "Agenda" },
    ]);
    expect(staffNotificationDestination("nutritionist", "nutritionist_agenda", null)).toEqual([
      "AgendaTab",
      { screen: "Agenda" },
    ]);
  });

  it("opens the submitted payment for the Administrator", () => {
    expect(staffNotificationDestination("administrator", "payment", paymentId)).toEqual([
      "PaymentsTab",
      { screen: "ReviewPayment", params: { paymentId } },
    ]);
  });

  it("opens the pending payments when the payment is not named", () => {
    expect(staffNotificationDestination("administrator", "payment", null)).toEqual([
      "PaymentsTab",
      { screen: "Payments" },
    ]);
  });

  it("opens the named Client for the Assistant", () => {
    expect(staffNotificationDestination("assistant", "client", clientId)).toEqual([
      "ClientsTab",
      { screen: "ClientOverview", params: { clientId } },
    ]);
  });

  it("opens nothing for an Assistant notice that names no Client", () => {
    expect(staffNotificationDestination("assistant", "client", null)).toBeNull();
  });

  it("opens the Freeze review for the Administrator", () => {
    expect(staffNotificationDestination("administrator", "freeze", paymentId)).toEqual([
      "PaymentsTab",
      { screen: "ReviewFreeze", params: { freezeId: paymentId } },
    ]);
  });

  it.each([
    ["assistant", "payment"],
    ["trainer", "nutritionist_agenda"],
    ["trainer", "client"],
    ["administrator", "trainer_schedule"],
    ["trainer", null],
  ] as const)("opens nothing for a %s notice about %s", (role, destinationType) => {
    expect(staffNotificationDestination(role, destinationType, paymentId)).toBeNull();
  });
});
