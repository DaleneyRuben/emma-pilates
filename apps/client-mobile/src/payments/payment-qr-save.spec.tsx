import { cleanup, fireEvent, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache, encodeBase64 } from "@pilates/mobile-core";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library/legacy";

import { jsonResponse, routeFetcher } from "../test-support";
import { baseRoutes, intent, openPlanDetail, pngHeader } from "./purchase-test-support";

jest.setTimeout(30_000);

const qrBytes = pngHeader(400, 200);
const saved = "QR guardado en tus fotos.";
const refused = "No pudimos guardar el QR. Permite que Emma Pilates agregue fotos en Ajustes.";

async function openPayment() {
  const screen = await openPlanDetail(
    routeFetcher({
      ...baseRoutes(0),
      "/api/v1/transfer-instructions/qr": () =>
        new Response(qrBytes, { headers: { "Content-Type": "image/png" } }),
      "POST /api/v1/purchase-intents": () => jsonResponse(intent, 201),
    }),
  );
  await fireEvent.press(screen.getByRole("button", { name: "Continuar al pago" }));
  await waitFor(() => {
    expect(screen.getByLabelText("Código QR del estudio")).toBeOnTheScreen();
  });
  return screen;
}

// MOB-063, design follow-up 95: «Guardar QR» adds the studio QR to the photo library.
describe("Client payment QR saving", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
    jest.mocked(MediaLibrary.requestPermissionsAsync).mockClear();
    jest.mocked(MediaLibrary.saveToLibraryAsync).mockClear();
    jest.mocked(FileSystem.writeAsStringAsync).mockClear();
  });

  it("saves the QR it shows as a photo, asking only to add photos", async () => {
    const screen = await openPayment();

    await fireEvent.press(screen.getByRole("button", { name: "Guardar QR" }));

    await waitFor(() => {
      expect(screen.getByText(saved)).toBeOnTheScreen();
    });
    expect(MediaLibrary.requestPermissionsAsync).toHaveBeenCalledWith(true, ["photo"]);
    expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
      "file:///cache/emma-pilates-qr.png",
      encodeBase64(qrBytes),
      { encoding: "base64" },
    );
    expect(MediaLibrary.saveToLibraryAsync).toHaveBeenCalledWith(
      "file:///cache/emma-pilates-qr.png",
    );
    expect(screen.queryByText(refused)).toBeNull();
  });

  it("explains a refused permission without saving", async () => {
    jest
      .mocked(MediaLibrary.requestPermissionsAsync)
      .mockResolvedValueOnce({ granted: false } as never);
    const screen = await openPayment();

    await fireEvent.press(screen.getByRole("button", { name: "Guardar QR" }));

    await waitFor(() => {
      expect(screen.getByText(refused)).toBeOnTheScreen();
    });
    expect(MediaLibrary.saveToLibraryAsync).not.toHaveBeenCalled();
    expect(screen.queryByText(saved)).toBeNull();
  });

  it("explains a failed save", async () => {
    jest.mocked(MediaLibrary.saveToLibraryAsync).mockRejectedValueOnce(new Error("disk full"));
    const screen = await openPayment();

    await fireEvent.press(screen.getByRole("button", { name: "Guardar QR" }));

    await waitFor(() => {
      expect(screen.getByText(refused)).toBeOnTheScreen();
    });
  });

  it("saves from the full-screen view's primary button, busy while it saves", async () => {
    let finish: () => void = () => undefined;
    jest.mocked(MediaLibrary.saveToLibraryAsync).mockReturnValueOnce(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    const screen = await openPayment();
    await fireEvent.press(screen.getByRole("button", { name: "Ampliar" }));
    const view = within(screen.getByTestId("full-screen-image"));

    await fireEvent.press(view.getByRole("button", { name: "Guardar QR" }));

    await waitFor(() => {
      expect(view.getByRole("button", { name: "Guardar QR" })).toBeBusy();
    });
    finish();
    await waitFor(() => {
      expect(view.getByText(saved)).toBeOnTheScreen();
    });
    expect(view.getByRole("button", { name: "Guardar QR" })).not.toBeBusy();
  });
});
