import { act, cleanup, fireEvent, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";
import { BackHandler } from "react-native";

import { jsonResponse, routeFetcher } from "../test-support";
import { baseRoutes, openPlanDetail, payment } from "./purchase-test-support";

jest.setTimeout(30_000);

type BackListener = () => boolean | null | undefined;

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
  return { press: () => [...listeners].reverse().some((listener) => listener() === true) };
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
    const fetcher = routeFetcher({
      ...baseRoutes(0),
      "POST /api/v1/purchase-intents": () =>
        jsonResponse({ code: "payment_pending_exists" }, 409),
      "/api/v1/payments/current": () => jsonResponse(payment),
    });
    const screen = await openPlanDetail(fetcher);

    await fireEvent.press(screen.getByTestId("plan-continue-to-payment"));
    await waitFor(() => expect(screen.getByText("Tu pago está en revisión")).toBeOnTheScreen());

    let handled = false;
    await act(async () => {
      handled = back.press();
    });

    expect(handled).toBe(true);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Comprar un plan" })).toBeOnTheScreen(),
    );
    expect(screen.queryByText("Tu pago está en revisión")).toBeNull();
  });
});
