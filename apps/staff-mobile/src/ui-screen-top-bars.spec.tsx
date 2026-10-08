import { cleanup, render, within } from "@testing-library/react-native";
import { clearMobileQueryCache, MobileQueryProvider } from "@pilates/mobile-core";
import type { ComponentType } from "react";

import { CancelClassScreen } from "./administrator/cancel-class-screen";
import { CancelSessionScreen } from "./administrator/cancel-session-screen";
import { ReviewPaymentScreen } from "./administrator/review-payment-screen";
import { AssistantRescheduleScreen } from "./assistant/assistant-reschedule-screen";
import { ClientBookingsScreen } from "./assistant/client-bookings-screen";
import { ClientHistoryScreen } from "./assistant/client-history-screen";
import { AvailabilityBlockFormScreen } from "./nutritionist/availability-block-form-screen";
import { AvailabilityScreen } from "./nutritionist/availability-screen";
import { StaffProfileScreen } from "./profile/staff-profile-screen";
import { StaffFetcherContext } from "./staff-fetcher";

jest.mock("@react-navigation/native", () => ({
  ...jest.requireActual("@react-navigation/native"),
  useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn(), popTo: jest.fn() }),
}));

// S23 reads the signed-in identity only to log out.
jest.mock("@pilates/mobile-core", () => ({
  ...jest.requireActual("@pilates/mobile-core"),
  useMobileIdentity: () => ({ logout: jest.fn() }),
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
  ["S16", AvailabilityScreen as ComponentType<never>, {}, "Mi disponibilidad"],
  ["S17", AvailabilityBlockFormScreen as ComponentType<never>, {}, "Nuevo horario"],
  ["S21", ClientBookingsScreen as ComponentType<never>, client, "Reservas de la clienta"],
  [
    "S21 reprogramar",
    AssistantRescheduleScreen as ComponentType<never>,
    { ...client, booking },
    "Reprogramar clase",
  ],
  ["S22", ClientHistoryScreen as ComponentType<never>, client, "Historial de clases"],
  ["S23", StaffProfileScreen as ComponentType<never>, {}, "Perfil"],
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

// MOB-034: the Staff screens draw the export's top bar, not «← Volver».
describe("The Staff screens' top bar", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it.each(screens)("%s draws the bar with its title", async (_id, Component, params, title) => {
    const screen = await renderScreen(Component, params);

    const bar = screen.getByTestId("screen-top-bar");
    expect(within(bar).getByLabelText(title)).toHaveStyle({ fontSize: 19 });
    expect(screen.getAllByLabelText(title)).toHaveLength(1);
    expect(screen.queryByText("← Volver")).toBeNull();
  });

  it("puts S16's «Nuevo horario» in the bar", async () => {
    const screen = await renderScreen(AvailabilityScreen as ComponentType<never>, {});

    expect(
      within(screen.getByTestId("screen-top-bar")).getByRole("button", { name: "Nuevo horario" }),
    ).toBeOnTheScreen();
  });
});
