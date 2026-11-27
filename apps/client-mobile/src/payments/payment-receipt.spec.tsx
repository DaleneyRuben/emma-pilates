import { cleanup, fireEvent, waitFor } from "@testing-library/react-native";
import {
  clearMobileQueryCache,
  createMemoryPushPlatform,
  encodeBase64,
} from "@pilates/mobile-core";
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

import { jsonResponse, routeFetcher } from "../test-support";
import { baseRoutes, intent, openPlanDetail, payment, receiptBytes } from "./purchase-test-support";

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

const receiptRoutes = () => ({
  ...baseRoutes(0),
  "POST /api/v1/purchase-intents": () => jsonResponse(intent, 201),
  "POST /api/v1/uploads": () =>
    jsonResponse({ id: "asset-1", uploadUrl: "/u", expiresAt: "2026-09-21T15:15:00.000Z" }, 201),
  "PUT /api/v1/uploads/asset-1/object": () => new Response(null, { status: 204 }),
  "POST /api/v1/uploads/asset-1/finalize": () =>
    jsonResponse({ id: "asset-1", state: "processing" }, 202),
  "/api/v1/uploads/asset-1": () =>
    jsonResponse({ id: "asset-1", state: "ready", mediaType: "image/jpeg" }),
  "POST /api/v1/purchase-intents/intent-1/receipt": () =>
    jsonResponse({ ...intent, receiptAttached: true }),
});

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
    const routes = routeFetcher({
      ...baseRoutes(0),
      "POST /api/v1/purchase-intents": () => jsonResponse(intent, 201),
      "POST /api/v1/uploads": () =>
        jsonResponse(
          { id: "asset-1", uploadUrl: "/u", expiresAt: "2026-09-21T15:15:00.000Z" },
          201,
        ),
      "PUT /api/v1/uploads/asset-1/object": () => new Response(null, { status: 204 }),
      "POST /api/v1/uploads/asset-1/finalize": () =>
        jsonResponse({ id: "asset-1", state: "processing" }, 202),
      "/api/v1/uploads/asset-1": () =>
        jsonResponse({ id: "asset-1", state: "ready", mediaType: "image/jpeg" }),
      "POST /api/v1/purchase-intents/intent-1/receipt": () =>
        jsonResponse({ ...intent, receiptAttached: true }),
    });
    // The PUT holds until the test lets it finish, to see the upload in flight.
    const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "PUT") await putDone;
      return routes(input, init);
    }) as ReturnType<typeof routeFetcher>;
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

  // Review: iOS presents one modal at a time, so «Cambiar comprobante»
  // closes the big view first and opens the picker once it has gone.
  it("opens the picker from the big view only after the view has closed", async () => {
    pickOneReceipt();
    const screen = await openPlanDetail(routeFetcher(receiptRoutes()));
    await fireEvent.press(screen.getByTestId("plan-continue-to-payment"));
    await fireEvent.press(
      await screen.findByRole("button", { name: "Sube tu comprobante de transferencia" }),
    );
    await fireEvent.press(await screen.findByRole("button", { name: "Ver comprobante en grande" }));
    const picks = jest.mocked(ImagePicker.launchImageLibraryAsync).mock.calls.length;

    await fireEvent.press(await screen.findByRole("button", { name: "Cambiar comprobante" }));

    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledTimes(picks);
    await waitFor(() => expect(screen.queryByText("Tu comprobante")).toBeNull());
    await waitFor(() =>
      expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledTimes(picks + 1),
    );
  });

  // Walkthrough n.º 9 (C11n): «Te avisaremos apenas esté listo» needs the
  // permission, so sending the receipt offers it with its own words.
  it("offers notifications with the payment's own words after sending", async () => {
    pickOneReceipt();
    const { platform } = createMemoryPushPlatform("undetermined");
    const sent: string[] = [];
    const fetcher = routeFetcher({
      ...baseRoutes(0),
      "POST /api/v1/purchase-intents": () => jsonResponse(intent, 201),
      "POST /api/v1/uploads": () =>
        jsonResponse(
          { id: "asset-1", uploadUrl: "/u", expiresAt: "2026-09-21T15:15:00.000Z" },
          201,
        ),
      "PUT /api/v1/uploads/asset-1/object": () => new Response(null, { status: 204 }),
      "POST /api/v1/uploads/asset-1/finalize": () =>
        jsonResponse({ id: "asset-1", state: "processing" }, 202),
      "/api/v1/uploads/asset-1": () =>
        jsonResponse({ id: "asset-1", state: "ready", mediaType: "image/jpeg" }),
      "POST /api/v1/purchase-intents/intent-1/receipt": () =>
        jsonResponse({ ...intent, receiptAttached: true }),
      "POST /api/v1/purchase-intents/intent-1/submit": () => {
        sent.push("submit");
        return jsonResponse(payment, 201);
      },
      "/api/v1/payments/current": () =>
        sent.length > 0 ? jsonResponse(payment) : jsonResponse({ code: "payment_not_found" }, 404),
    });
    const screen = await openPlanDetail(fetcher, { pushPlatform: platform });
    await fireEvent.press(screen.getByTestId("plan-continue-to-payment"));
    await fireEvent.press(
      await screen.findByRole("button", { name: "Sube tu comprobante de transferencia" }),
    );
    await waitFor(
      () => expect(screen.getByRole("button", { name: "Enviar comprobante" })).toBeEnabled(),
      {
        timeout: 10_000,
      },
    );

    await fireEvent.press(screen.getByRole("button", { name: "Enviar comprobante" }));

    expect(await screen.findByText("Te avisamos cuando aprobemos tu pago")).toBeOnTheScreen();
    expect(
      screen.getByText(
        "Activa las notificaciones y te escribimos apenas el estudio revise tu comprobante.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText("Tu pago está en revisión")).toBeOnTheScreen();
  });
});
