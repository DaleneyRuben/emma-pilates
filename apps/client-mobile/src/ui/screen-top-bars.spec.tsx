import { cleanup, render, within } from "@testing-library/react-native";
import {
  clearMobileQueryCache,
  fontFamilies,
  MobileQueryProvider,
  typography,
} from "@pilates/mobile-core";
import type { ComponentType } from "react";

import { RescheduleScreen } from "../booking/reschedule-screen";
import { SessionDetailScreen } from "../booking/session-detail-screen";
import { ClientFetcherContext } from "../client-fetcher";
import { BookEvaluationScreen } from "../evaluations/book-evaluation-screen";
import { EvaluationAvailabilityScreen } from "../evaluations/evaluation-availability-screen";
import { PaymentScreen } from "../payments/payment-screen";
import { PaymentStatusScreen } from "../payments/payment-status-screen";
import { ReferralsScreen } from "../payments/referrals-screen";
import { PlanDetailScreen } from "../plans/plan-detail-screen";
import { PlansScreen } from "../plans/plans-screen";
import { CloseAccountScreen } from "../profile/close-account-screen";
import { EditProfileScreen } from "../profile/edit-profile-screen";
import { SubscriptionScreen } from "../subscription/subscription-screen";
import { jsonResponse } from "../test-support";

jest.mock("@react-navigation/native", () => ({
  ...jest.requireActual("@react-navigation/native"),
  useIsFocused: () => true,
  useFocusEffect: jest.fn(),
  useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn(), popTo: jest.fn() }),
}));

// 24 reads the signed-in identity only to end the session after closing.
jest.mock("@pilates/mobile-core", () => ({
  ...jest.requireActual("@pilates/mobile-core"),
  useMobileIdentity: () => ({ endSession: jest.fn() }),
}));

// Every request stays pending, so each screen shows its loading state.
const pending = (() => new Promise<Response>(() => undefined)) as typeof globalThis.fetch;

const booking = {
  bookingId: "booking-1",
  branch: { id: "branch-1", name: "Centro" },
  classType: { id: "type-1", name: "Reformer" },
  endsAt: "2026-10-05T13:00:00.000Z",
  sessionId: "session-1",
  startsAt: "2026-10-05T12:00:00.000Z",
  trainer: { id: "trainer-1", name: "Emma Vargas" },
};
const slot = {
  branchId: "branch-1",
  branchName: "Centro",
  durationMinutes: 45,
  endsAt: "2026-10-05T13:45:00.000Z",
  id: "slot-1",
  nutritionistName: "Gabriela Flores",
  startsAt: "2026-10-05T13:00:00.000Z",
};

// EncabezadoA (FIX-089): each screen's own name, never the parent's, in the
// shared 30 pt Lora title under the back arrow.
const screens: [string, ComponentType<never>, object, string][] = [
  ["04", SessionDetailScreen as ComponentType<never>, { sessionId: "session-1" }, "Clase"],
  ["06", RescheduleScreen as ComponentType<never>, { booking }, "Reprogramar clase"],
  ["08", PlansScreen as ComponentType<never>, {}, "Elige tu plan"],
  ["09", PlanDetailScreen as ComponentType<never>, { planId: "plan-1" }, "Detalle del plan"],
  ["10", PaymentScreen as ComponentType<never>, {}, "Pago por transferencia"],
  ["12", SubscriptionScreen as ComponentType<never>, {}, "Mi plan"],
  ["13", EvaluationAvailabilityScreen as ComponentType<never>, {}, "Evaluación nutricional"],
  ["14", BookEvaluationScreen as ComponentType<never>, { slot }, "Confirma tu cita"],
  ["16", ReferralsScreen as ComponentType<never>, {}, "Invita a una amiga"],
  ["22", EditProfileScreen as ComponentType<never>, {}, "Editar perfil"],
  ["24", CloseAccountScreen as ComponentType<never>, {}, "Cerrar mi cuenta"],
];

// MOB-034: the Client screens draw the export's top bar, not «← Volver».
describe("The Client screens' top bar", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it.each(screens)("%s draws the bar with its title", async (_id, Component, params, title) => {
    const Screen = Component as ComponentType<{ route: { params: object } }>;
    const screen = await render(
      <MobileQueryProvider>
        <ClientFetcherContext.Provider value={pending}>
          <Screen route={{ params }} />
        </ClientFetcherContext.Provider>
      </MobileQueryProvider>,
    );

    const bar = screen.getByTestId("screen-top-bar");
    const label = within(bar).getByLabelText(title);
    expect(label).toHaveStyle({ fontFamily: fontFamilies.display, fontSize: typography.title });
    expect(screen.getAllByLabelText(title)).toHaveLength(1);
  });

  it("11 draws the shared bar, not a lone back link, when the payment is missing", async () => {
    const missing = (() =>
      Promise.resolve(
        jsonResponse({ code: "payment_not_found" }, 404),
      )) as unknown as typeof globalThis.fetch;
    const screen = await render(
      <MobileQueryProvider>
        <ClientFetcherContext.Provider value={missing}>
          <PaymentStatusScreen />
        </ClientFetcherContext.Provider>
      </MobileQueryProvider>,
    );

    const bar = await screen.findByTestId("screen-top-bar");
    expect(within(bar).getByLabelText("Tu pago")).toHaveStyle({ fontSize: typography.title });
    expect(within(bar).getByLabelText("Volver")).toBeOnTheScreen();
  });
});
