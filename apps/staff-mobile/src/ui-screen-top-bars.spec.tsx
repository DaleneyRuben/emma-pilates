import { cleanup, render } from "@testing-library/react-native";
import { clearMobileQueryCache, MobileQueryProvider } from "@pilates/mobile-core";
import type { ComponentType } from "react";

import { CancelClassScreen } from "./administrator/cancel-class-screen";
import { CancelSessionScreen } from "./administrator/cancel-session-screen";
import { ReviewPaymentScreen } from "./administrator/review-payment-screen";
import { AssistantRescheduleScreen } from "./assistant/assistant-reschedule-screen";
import { AvailabilityBlockFormScreen } from "./nutritionist/availability-block-form-screen";
import { StaffFetcherContext } from "./staff-fetcher";

jest.mock("@react-navigation/native", () => ({
  ...jest.requireActual("@react-navigation/native"),
  useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn(), popTo: jest.fn() }),
}));

// Every request stays pending, so each screen shows its loading state.
const pending = (() => new Promise<Response>(() => undefined)) as typeof globalThis.fetch;

const client = { clientId: "client-1", clientName: "Valeria Áñez" };
const session = {
  branchName: "Centro",
  classTypeName: "Reformer Intermedio",
  endsAt: "2026-10-05T13:00:00.000Z",
  id: "session-1",
  startsAt: "2026-10-05T12:00:00.000Z",
  trainerName: "Emma Vargas",
};
const booking = {
  bookingId: "booking-1",
  branchName: "Centro",
  classTypeName: "Reformer Intermedio",
  endsAt: "2026-10-05T13:00:00.000Z",
  sessionId: "session-1",
  startsAt: "2026-10-05T12:00:00.000Z",
  trainerName: "Emma Vargas",
};

const screens: [string, ComponentType<never>, object, string][] = [
  ["S12", ReviewPaymentScreen as ComponentType<never>, { paymentId: "payment-1" }, "Revisar pago"],
  ["S13", CancelClassScreen as ComponentType<never>, {}, "Cancelar una clase"],
  ["S14", CancelSessionScreen as ComponentType<never>, { session }, "Cancelar sesión"],
  ["S17", AvailabilityBlockFormScreen as ComponentType<never>, {}, "Nuevo horario"],
  [
    "S21 reprogramar",
    AssistantRescheduleScreen as ComponentType<never>,
    { ...client, booking },
    "Reprogramar clase",
  ],
];

const renderScreen = (Component: ComponentType<never>, params: object) => {
  const Screen = Component as ComponentType<{ route: { params: object } }>;
  return render(
    <MobileQueryProvider>
      <StaffFetcherContext.Provider value={pending}>
        <Screen route={{ params }} />
      </StaffFetcherContext.Provider>
    </MobileQueryProvider>,
  );
};

// v2: a pushed Staff screen opens with the back chevron and its Lora title.
describe("The Staff screens' top bar", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it.each(screens)(
    "%s draws the back bar with its title",
    async (_id, Component, params, title) => {
      const screen = await renderScreen(Component, params);

      expect(screen.getByTestId("back-bar")).toHaveProp("accessibilityLabel", "Volver");
      expect(screen.getAllByLabelText(title)).toHaveLength(1);
      expect(screen.queryByTestId("screen-top-bar")).toBeNull();
    },
  );
});
