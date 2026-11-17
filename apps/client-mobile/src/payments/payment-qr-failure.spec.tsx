import { cleanup, fireEvent, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { jsonResponse, routeFetcher } from "../test-support";
import { baseRoutes, intent, openPlanDetail, pngHeader } from "./purchase-test-support";

jest.setTimeout(30_000);

// Walkthrough n.º 71: offline, «Pago por transferencia» showed an empty box
// where the studio QR goes, and nothing to do about it.
describe("Client payment QR that cannot load", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("says so and loads it again with Reintentar", async () => {
    let reachable = false;
    const screen = await openPlanDetail(
      routeFetcher({
        ...baseRoutes(0),
        "/api/v1/transfer-instructions/qr": () => {
          if (!reachable) throw new TypeError("Network request failed");
          return new Response(pngHeader(200, 200), { headers: { "Content-Type": "image/png" } });
        },
        "POST /api/v1/purchase-intents": () => jsonResponse(intent, 201),
      }),
    );
    await fireEvent.press(screen.getByTestId("plan-continue-to-payment"));

    expect(await screen.findByText("No pudimos cargar el QR del estudio.")).toBeOnTheScreen();
    reachable = true;
    await fireEvent.press(screen.getByRole("button", { name: "Reintentar" }));

    await waitFor(() => expect(screen.getByLabelText("Código QR del estudio")).toBeOnTheScreen());
    expect(screen.queryByText("No pudimos cargar el QR del estudio.")).toBeNull();
  });
});
