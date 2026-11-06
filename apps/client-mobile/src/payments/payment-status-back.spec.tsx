import { act, cleanup, fireEvent, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";
import { BackHandler } from "react-native";

import { jsonResponse, routeFetcher } from "../test-support";
import { baseRoutes, openPlanDetail, payment } from "./purchase-test-support";

jest.setTimeout(30_000);

type BackListener = Parameters<typeof BackHandler.addEventListener>[1];
// The listeners ignore the event; any value of its type will do.
const backPress = {} as Parameters<BackListener>[0];

// The Android back button: the newest listener runs first, as in BackHandler.
function trackBackListeners() {
  const listeners: BackListener[] = [];
  jest.spyOn(BackHandler, "addEventListener").mockImplementation((_event, listener) => {
    listeners.push(listener);
    return {
      remove: () => {
        listeners.splice(listeners.indexOf(listener), 1);
      },
    };
  });
  return { press: () => [...listeners].reverse().some((listener) => listener(backPress) === true) };
}

// Seen on the emulator (MOB-074): back from «Tu pago está en revisión»
// reopened the spent payment screen, which only said «No encontramos un pago
// pendiente.». The result has no back arrow; back leads home like its button.
describe("the Android back button on the payment result", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
    jest.restoreAllMocks();
  });

  it("goes to Inicio instead of the spent payment screen", async () => {
    const back = trackBackListeners();
    let refused = false;
    const fetcher = routeFetcher({
      ...baseRoutes(0),
      "POST /api/v1/purchase-intents": () => {
        refused = true;
        return jsonResponse({ code: "payment_pending_exists" }, 409);
      },
      // Inicio saw no Payment; the server refuses the purchase because a
      // receipt sent from elsewhere is pending (follow-up 246's gate came late).
      "/api/v1/payments/current": () =>
        refused ? jsonResponse(payment) : jsonResponse({ code: "payment_not_found" }, 404),
    });
    const screen = await openPlanDetail(fetcher);

    await fireEvent.press(screen.getByTestId("plan-continue-to-payment"));
    await waitFor(() => expect(screen.getByText("Tu pago está en revisión")).toBeOnTheScreen());

    let handled = false;
    await act(async () => {
      handled = back.press();
    });

    expect(handled).toBe(true);
    // Inicio, now showing the pending payment's card (follow-up 246).
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Ver estado del pago" })).toBeOnTheScreen(),
    );
    expect(screen.queryByText(/Nuestro equipo está revisando/)).toBeNull();
  });
});
