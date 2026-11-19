import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache, createMemoryPushPlatform } from "@pilates/mobile-core";

import App from "../../App";
import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";
import {
  baseRoutes,
  boliviaInstant,
  civilDateIn,
  dayName,
  openProfileRow,
  page,
  secondDay,
  upcomingEvaluation,
} from "./evaluation-test-support";

jest.setTimeout(30_000);

// Walkthrough finding 68 (FIX-056): the Nutritionist cancelled a confirmed
// paid Evaluation. The payment stays and the Client picks another slot, even
// after the released time has passed.
const releasedStart = boliviaInstant(civilDateIn(-1), "09:00");
const released = upcomingEvaluation("evaluation-paid", releasedStart, {
  included: false,
  priceCentavos: 7_000,
  paymentId: "payment-1",
  receiptAttached: true,
  cancellable: false,
  reschedulable: false,
  slotReleased: true,
});
const movedStart = boliviaInstant(secondDay, "15:00");
const moved = upcomingEvaluation("evaluation-paid", movedStart, {
  included: false,
  priceCentavos: 7_000,
  paymentId: "payment-1",
  slotId: "slot-3",
  cancellable: false,
  reschedulable: true,
  slotReleased: false,
});

const releasedRoutes = () => {
  let posted = false;
  return routeFetcher({
    ...baseRoutes(),
    "/api/v1/evaluations?scope=upcoming": () => jsonResponse(page([posted ? moved : released])),
    "POST /api/v1/evaluations/evaluation-paid/reschedule": (init) => {
      posted = true;
      expect(JSON.parse(String(init?.body))).toEqual({ slotId: "slot-3" });
      return jsonResponse(moved);
    },
    "PUT /api/v1/notifications/devices/current": () => new Response(null, { status: 204 }),
    "POST /api/v1/notifications/11111111-1111-4111-8111-111111111111/read": () =>
      new Response(null, { status: 204 }),
  });
};

describe("A paid Evaluation whose slot the studio released", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("says the studio released her slot and moves it through Elegir turno", async () => {
    const screen = await openProfileRow(releasedRoutes(), "Evaluación nutricional");

    expect(await screen.findByText("El estudio liberó tu turno")).toBeOnTheScreen();
    expect(
      screen.getByText("Tu pago de Bs 70 sigue vigente: elige otro turno y no pagas de nuevo."),
    ).toBeOnTheScreen();
    expect(screen.queryByText(/Ya no se puede/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Cancelar evaluación" })).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: "Elegir turno" }));
    expect(await screen.findByText("Elige el nuevo horario")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: dayName(secondDay) }));
    await fireEvent.press(screen.getByRole("button", { name: "Turno 15:00" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Sí, mover evaluación" }));

    expect(await screen.findByText("Evaluación reprogramada")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Elegir turno" })).toBeNull();
  });

  // Walkthrough finding 97: while her paid slot waits for a new time, the
  // screen offers no new Evaluation to pay for; Elegir turno is the way.
  it("offers no other Evaluation to pay for while the released one waits", async () => {
    const screen = await openProfileRow(releasedRoutes(), "Evaluación nutricional");

    expect(await screen.findByText("El estudio liberó tu turno")).toBeOnTheScreen();
    expect(screen.queryByText("¿Otra evaluación?")).toBeNull();
    expect(screen.queryByRole("button", { name: "Turno 15:00" })).toBeNull();
    expect(screen.queryByText(/Cuesta Bs 70/)).toBeNull();
  });

  it("opens Evaluación nutricional with Elegir turno from the studio's notice", async () => {
    const device = createMemoryPushPlatform();
    const screen = await render(
      <App
        runtime={createClientRuntime(releasedRoutes(), {
          installationIdentifier: () => Promise.resolve("installation-1"),
          pushPlatform: device.platform,
        })}
      />,
    );
    await waitFor(
      () =>
        expect(
          screen.getByTestId("tab-booking", { includeHiddenElements: true }),
        ).toBeOnTheScreen(),
      { timeout: 10_000 },
    );

    await act(async () =>
      device.tap({
        notificationId: "11111111-1111-4111-8111-111111111111",
        type: "evaluation_reschedule_required",
        destinationType: "evaluation",
        destinationId: "22222222-2222-4222-8222-222222222222",
      }),
    );

    expect(await screen.findByRole("button", { name: "Elegir turno" })).toBeOnTheScreen();
  });
});
