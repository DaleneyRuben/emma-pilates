import { cleanup, fireEvent, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { jsonResponse, routeFetcher } from "../test-support";
import { baseRoutes, intent, openPlanDetail, pngHeader } from "./purchase-test-support";

jest.setTimeout(30_000);

async function openPayment() {
  const screen = await openPlanDetail(
    routeFetcher({
      ...baseRoutes(0),
      // A bank QR exported wider than tall.
      "/api/v1/transfer-instructions/qr": () =>
        new Response(pngHeader(400, 200), { headers: { "Content-Type": "image/png" } }),
      "POST /api/v1/purchase-intents": () => jsonResponse(intent, 201),
    }),
  );
  await fireEvent.press(screen.getByRole("button", { name: "Continuar al pago" }));
  await waitFor(() => {
    expect(screen.getByLabelText("Código QR del estudio")).toBeOnTheScreen();
  });
  return screen;
}

// MOB-062, design follow-up 95: the studio QR on 10.
describe("Client payment QR", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("draws the QR whole at its own proportions", async () => {
    const screen = await openPayment();

    await waitFor(() => {
      expect(screen.getByLabelText("Código QR del estudio")).toHaveStyle({
        height: 95,
        width: 190,
      });
    });
    expect(screen.getByLabelText("Código QR del estudio")).toHaveProp("resizeMode", "contain");
  });

  it("opens the QR full screen from the QR and from Ampliar", async () => {
    const screen = await openPayment();

    await fireEvent.press(
      screen.getByRole("button", { name: "Código QR del estudio. Toca para ampliarlo." }),
    );
    expect(screen.getByLabelText("Código QR ampliado")).toBeOnTheScreen();
    expect(screen.getByText("QR del estudio")).toBeOnTheScreen();
    expect(
      screen.getByText("Guárdalo para elegirlo desde la galería en tu app bancaria."),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByLabelText("Código QR ampliado")).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: "Ampliar" }));
    expect(screen.getByLabelText("Código QR ampliado")).toBeOnTheScreen();
  });

  it("closes the full-screen QR with the back gesture", async () => {
    const screen = await openPayment();
    await fireEvent.press(screen.getByRole("button", { name: "Ampliar" }));

    await fireEvent(screen.getByTestId("full-screen-image"), "requestClose");

    expect(screen.queryByLabelText("Código QR ampliado")).toBeNull();
  });
});
