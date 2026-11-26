import { cleanup, fireEvent, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache, encodeBase64 } from "@pilates/mobile-core";
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

import { jsonResponse, routeFetcher } from "../test-support";
import { baseRoutes, intent, openPlanDetail, receiptBytes } from "./purchase-test-support";

jest.setTimeout(30_000);

const pickOneReceipt = () => {
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
    canceled: false,
    assets: [{ uri: "file:///receipt.png", mimeType: "image/png", width: 10, height: 10 }],
  } as never);
  jest
    .mocked(ImageManipulator.manipulateAsync)
    .mockResolvedValue({ uri: "file:///receipt.jpg", width: 10, height: 10 });
  jest.mocked(FileSystem.readAsStringAsync).mockResolvedValue(encodeBase64(receiptBytes));
};

// Walkthrough n.º 7 and 23 (C10u, C10b, C10v).
describe("the transfer receipt on Pago por transferencia", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("waits for the upload, then opens the receipt big with Cambiar comprobante", async () => {
    pickOneReceipt();
    let finishPut: () => void = () => undefined;
    const putDone = new Promise<void>((resolve) => {
      finishPut = resolve;
    });
    const fetcher = routeFetcher({
      ...baseRoutes(0),
      "POST /api/v1/purchase-intents": () => jsonResponse(intent, 201),
      "POST /api/v1/uploads": () =>
        jsonResponse(
          { id: "asset-1", uploadUrl: "/u", expiresAt: "2026-09-21T15:15:00.000Z" },
          201,
        ),
      "PUT /api/v1/uploads/asset-1/object": async () => {
        await putDone;
        return new Response(null, { status: 204 });
      },
      "POST /api/v1/uploads/asset-1/finalize": () =>
        jsonResponse({ id: "asset-1", state: "processing" }, 202),
      "/api/v1/uploads/asset-1": () =>
        jsonResponse({ id: "asset-1", state: "ready", mediaType: "image/jpeg" }),
      "POST /api/v1/purchase-intents/intent-1/receipt": () =>
        jsonResponse({ ...intent, receiptAttached: true }),
    });
    const screen = await openPlanDetail(fetcher);
    await fireEvent.press(screen.getByTestId("plan-continue-to-payment"));
    await fireEvent.press(
      await screen.findByRole("button", { name: "Sube tu comprobante de transferencia" }),
    );

    expect(await screen.findByText("Subiendo comprobante")).toBeOnTheScreen();
    expect(screen.getByText("Espera a que termine de subir")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Enviar comprobante" })).toBeDisabled();

    finishPut();
    expect(await screen.findByText("Comprobante listo")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Ver comprobante en grande" }));

    expect(await screen.findByText("Tu comprobante")).toBeOnTheScreen();
    expect(
      screen.getByText("Revisa que se lean el monto, la fecha y el destinatario."),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Cambiar comprobante" })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Cerrar" }));
    await waitFor(() => expect(screen.queryByText("Tu comprobante")).toBeNull());
  });
});
