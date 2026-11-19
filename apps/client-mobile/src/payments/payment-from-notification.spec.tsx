import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";
import { payment } from "./purchase-test-support";

jest.setTimeout(30_000);

const rejected = {
  ...payment,
  state: "rejected",
  decidedAt: "2026-09-21T18:00:00.000Z",
  rejectionReason: "No vimos la transferencia.",
};

const fetcher = routeFetcher({
  "/api/v1/clients/current": () =>
    jsonResponse({
      id: "client-1",
      name: "Elena Rojas",
      email: "elena@example.com",
      phone: null,
      referralCode: "REF-ELENA",
    }),
  "/api/v1/clients/current/subscription": () => jsonResponse({ status: "none" }),
  "/api/v1/clients/current/credit": () =>
    jsonResponse({ availableCentavos: 0, reservedCentavos: 0 }),
  "/api/v1/payments/current": () => jsonResponse(rejected),
  "/api/v1/bookings": () => jsonResponse([]),
  "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 1 }),
  "/api/v1/notifications?limit=50": () =>
    jsonResponse({
      items: [
        {
          id: "n1",
          category: "payments",
          type: "aviso",
          title: "Aviso",
          message: "No pudimos confirmar tu pago.",
          destinationType: "payment",
          destinationId: "payment-1",
          createdAt: new Date(Date.now() - 60_000).toISOString(),
          readAt: null,
        },
      ],
      hasMore: false,
      nextCursor: null,
    }),
});

const mentionsPopToTop = (calls: unknown[][]) =>
  calls.some((call) => call.some((part) => String(part).includes("POP_TO_TOP")));

// FIX-090 (states review Y8): a rejected payment opened from Notificaciones
// is the only screen of Perfil's stack. «Volver al inicio» raised «The action
// 'POP_TO_TOP' was not handled» and left Perfil on the spent payment.
describe("«Volver al inicio» on a payment opened from a notification", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
    jest.restoreAllMocks();
  });

  it("goes home without an unhandled action and leaves Perfil on its root", async () => {
    const errors = jest.spyOn(console, "error");
    const screen = await render(<App runtime={createClientRuntime(fetcher)} />);
    await waitFor(
      () => expect(screen.getByRole("button", { name: /^Notificaciones/ })).toBeOnTheScreen(),
      { timeout: 10_000 },
    );
    await fireEvent.press(screen.getByRole("button", { name: /^Notificaciones/ }));
    await waitFor(() =>
      expect(screen.getByText("No pudimos confirmar tu pago.")).toBeOnTheScreen(),
    );
    await fireEvent.press(screen.getByText("No pudimos confirmar tu pago."));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Volver al inicio" })).toBeOnTheScreen(),
    );

    await fireEvent.press(screen.getByRole("button", { name: "Volver al inicio" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /^Notificaciones/ })).toBeOnTheScreen(),
    );
    expect(mentionsPopToTop(errors.mock.calls)).toBe(false);
    await fireEvent.press(screen.getByLabelText(/^Perfil, tab/));
    await waitFor(() => expect(screen.getByLabelText("Perfil")).toBeOnTheScreen());
    expect(screen.queryByRole("button", { name: "Volver al inicio" })).toBeNull();
  });
});
