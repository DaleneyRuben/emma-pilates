import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createClientRuntime, jsonResponse, routeFetcher, studioRules } from "../test-support";

jest.setTimeout(20_000);

// BKM-004 (ADR-0101): the rules the Client app shows come from
// GET /studio-rules, so a change on the admin web reaches it without a build.
const profile = {
  id: "client-1",
  name: "Mariana Peña",
  email: "mariana@example.com",
  phone: null,
  referralCode: "REF-MARIANA",
};
const plan = {
  id: "plan-8",
  name: "8 clases",
  durationMonths: 1,
  classAllowance: 8,
  priceCentavos: 59_000,
};
const active = {
  status: "active",
  subscription: {
    id: "subscription-1",
    planName: "8 clases",
    originalClassAllowance: 8,
    remainingClassAllowance: 5,
    startsOn: "2026-09-11",
    endsOn: "2026-10-11",
  },
};
const hour = 60 * 60 * 1_000;
const startsAt = new Date(Date.now() + 26 * hour);
const booking = {
  kind: "booking",
  bookingId: "booking-1",
  sessionId: "session-1",
  classTypeName: "Reformer Pilates",
  trainerName: "Emma Vargas",
  branchName: "Centro",
  startsAt: startsAt.toISOString(),
  endsAt: new Date(startsAt.getTime() + 50 * 60 * 1_000).toISOString(),
};

const withoutPlan = (rules: () => Response) =>
  routeFetcher({
    "/api/v1/clients/current": () => jsonResponse(profile),
    "/api/v1/clients/current/subscription": () =>
      jsonResponse({ status: "none", subscription: null }),
    "/api/v1/plans": () => jsonResponse([plan]),
    "/api/v1/plans/plan-8": () => jsonResponse(plan),
    "/api/v1/studio-rules": rules,
  });

describe("Client copy from the Studio Settings", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("prices «Paquetes desde» from the cheapest visible Plan", async () => {
    const screen = await render(
      <App
        runtime={createClientRuntime(
          withoutPlan(() => jsonResponse({ ...studioRules, plansFromPriceCentavos: 8_000 })),
        )}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Paquetes desde Bs 80. Puedes pagar en el estudio o desde la app."),
      ).toBeOnTheScreen();
    });
  });

  it("leaves the price out while the rules cannot be read", async () => {
    const screen = await render(
      <App runtime={createClientRuntime(withoutPlan(() => jsonResponse({}, 503)))} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Puedes pagar en el estudio o desde la app.")).toBeOnTheScreen();
    });
  });

  it("writes the configured Cancellation Window in the Plan detail", async () => {
    const screen = await render(
      <App
        runtime={createClientRuntime(
          withoutPlan(() => jsonResponse({ ...studioRules, cancellationWindowMinutes: 180 })),
        )}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Comprar un plan" })).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: "Comprar un plan" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "8 clases" })).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: "8 clases" }));

    await waitFor(() => {
      expect(
        screen.getByText("Cancelación sin costo hasta 3 h antes de cada clase."),
      ).toBeOnTheScreen();
    });
  });

  it("offers only Reprogramar for a booking inside a longer window", async () => {
    const fetcher = routeFetcher({
      "/api/v1/clients/current": () => jsonResponse(profile),
      "/api/v1/clients/current/subscription": () => jsonResponse(active),
      "/api/v1/bookings": () => jsonResponse([booking]),
      "/api/v1/studio-rules": () =>
        jsonResponse({ ...studioRules, cancellationWindowMinutes: 30 * 60 }),
    });
    const screen = await render(<App runtime={createClientRuntime(fetcher)} />);

    await waitFor(
      () => {
        expect(screen.getByRole("button", { name: /Mis Reservas, tab/ })).toBeOnTheScreen();
      },
      { timeout: 10_000 },
    );
    await fireEvent.press(screen.getByRole("button", { name: /Mis Reservas, tab/ }));

    await waitFor(() => {
      expect(screen.getByText("No cancelable")).toBeOnTheScreen();
    });
    expect(screen.getByRole("button", { name: "Reprogramar" })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Cancelar" })).not.toBeOnTheScreen();
  });
});
