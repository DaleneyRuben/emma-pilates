import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";

import App from "../../App";
import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";
import { encodeBase64 } from "@pilates/mobile-core";
import {
  baseRoutes,
  instructions,
  intent,
  openPlanDetail,
  payment,
  receiptBytes,
} from "./purchase-test-support";

jest.setTimeout(30_000);

describe("Client purchase flow", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockReset();
    jest.mocked(FileSystem.readAsStringAsync).mockReset();
  });

  it("applies available Credit on the Plan detail and opens the transfer payment", async () => {
    const created = jest.fn();
    const instructionsRequested = jest.fn(() => jsonResponse(instructions));
    const fetcher = routeFetcher({
      ...baseRoutes(6000),
      "/api/v1/transfer-instructions": instructionsRequested,
      "POST /api/v1/purchase-intents": (init) => {
        created(init?.headers, JSON.parse(String(init?.body)));
        return jsonResponse(intent, 201);
      },
    });
    const screen = await openPlanDetail(fetcher);

    expect(screen.getByText("Crédito aplicado")).toBeOnTheScreen();
    expect(screen.getByText("−Bs 60")).toBeOnTheScreen();
    expect(screen.getByText("Bs 500")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Continuar al pago" }));

    await waitFor(() => {
      expect(screen.getByText("Pago por transferencia")).toBeOnTheScreen();
    });
    expect(created).toHaveBeenCalledWith(
      expect.objectContaining({ "idempotency-key": expect.any(String) }),
      { planId: "plan-8", startsOn: "2026-10-08" },
    );
    expect(screen.getAllByText("Bs 500").length).toBeGreaterThan(0);
    expect(
      screen.getByText("Escanea el código con tu app bancaria y transfiere el monto exacto."),
    ).toBeOnTheScreen();
    await waitFor(() => {
      expect(screen.getByLabelText("Código QR del estudio")).toBeOnTheScreen();
    });
    // PAY-003: the QR is the only instruction; no bank details are read or shown.
    expect(instructionsRequested).not.toHaveBeenCalled();
    expect(screen.queryByText("Emma Pilates Studio")).toBeNull();
    expect(screen.queryByText(/Cuenta/)).toBeNull();
    expect(screen.getByRole("button", { name: "Enviar comprobante" })).toBeDisabled();
  });

  it("uploads the chosen receipt, waits for verification, attaches it, and submits the transfer", async () => {
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: "file:///receipt.png",
          mimeType: "image/png",
          fileSize: receiptBytes.byteLength,
          width: 10,
          height: 10,
        },
      ],
    } as never);
    jest
      .mocked(ImageManipulator.manipulateAsync)
      .mockResolvedValue({ uri: "file:///receipt.jpg", width: 10, height: 10 });
    jest.mocked(FileSystem.readAsStringAsync).mockResolvedValue(encodeBase64(receiptBytes));
    const calls: string[] = [];
    let statusReads = 0;
    const fetcher = routeFetcher({
      ...baseRoutes(6000),
      "POST /api/v1/purchase-intents": () => jsonResponse(intent, 201),
      "POST /api/v1/uploads": (init) => {
        calls.push(`upload ${String(init?.body)}`);
        return jsonResponse(
          {
            id: "asset-1",
            uploadUrl: "/api/v1/uploads/asset-1/object",
            expiresAt: "2026-09-21T15:15:00.000Z",
          },
          201,
        );
      },
      "PUT /api/v1/uploads/asset-1/object": (init) => {
        calls.push(`put ${(init?.headers as Record<string, string>)["Content-Type"]}`);
        return new Response(null, { status: 204 });
      },
      "POST /api/v1/uploads/asset-1/finalize": () => {
        calls.push("finalize");
        return jsonResponse({ id: "asset-1", state: "processing" }, 202);
      },
      "/api/v1/uploads/asset-1": () => {
        statusReads += 1;
        return jsonResponse({
          id: "asset-1",
          state: statusReads < 2 ? "processing" : "ready",
          mediaType: "image/jpeg",
        });
      },
      "POST /api/v1/purchase-intents/intent-1/receipt": (init) => {
        calls.push(`attach ${String(init?.body)}`);
        return jsonResponse({ ...intent, receiptAttached: true });
      },
      "POST /api/v1/purchase-intents/intent-1/submit": () => {
        calls.push("submit");
        return jsonResponse(payment, 201);
      },
      "/api/v1/payments/current": () => jsonResponse(payment),
    });
    const screen = await openPlanDetail(fetcher);
    await fireEvent.press(screen.getByRole("button", { name: "Continuar al pago" }));
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Sube tu comprobante de transferencia" }),
      ).toBeOnTheScreen();
    });

    await fireEvent.press(
      screen.getByRole("button", { name: "Sube tu comprobante de transferencia" }),
    );

    await waitFor(
      () => {
        expect(screen.getByRole("button", { name: "Enviar comprobante" })).toBeEnabled();
      },
      { timeout: 10_000 },
    );
    const checksum = require("node:crypto")
      .createHash("sha256")
      .update(receiptBytes)
      .digest("base64");
    expect(calls).toEqual([
      `upload ${JSON.stringify({ purpose: "transfer_receipt", mediaType: "image/jpeg", byteSize: 8, checksum })}`,
      "put image/jpeg",
      "finalize",
      `attach ${JSON.stringify({ imageAssetId: "asset-1" })}`,
    ]);
    expect(screen.getByLabelText("Comprobante adjunto")).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Comprobante adjunto. Toca para cambiarlo." }),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Enviar comprobante" }));

    await waitFor(() => {
      expect(screen.getByText("Tu pago está en revisión")).toBeOnTheScreen();
    });
    expect(calls.at(-1)).toBe("submit");
    expect(
      screen.getByText(
        "Un administrador va a confirmar tu comprobante pronto. Te avisaremos apenas esté listo.",
      ),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Volver al inicio" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Comprar un plan" })).toBeOnTheScreen();
    });
  });

  it("activates immediately through Credit when it covers the whole Plan", async () => {
    const purchased = jest.fn();
    const confirmed = {
      ...payment,
      method: "credit_only",
      state: "confirmed",
      creditAppliedCentavos: 56_000,
      amountDueCentavos: 0,
      decidedAt: "2026-09-21T16:00:00.000Z",
      subscriptionId: "subscription-1",
    };
    const fetcher = routeFetcher({
      ...baseRoutes(60_000),
      "POST /api/v1/credit-purchases": (init) => {
        purchased(JSON.parse(String(init?.body)));
        return jsonResponse(confirmed, 201);
      },
      "/api/v1/payments/current": () => jsonResponse(confirmed),
    });
    const screen = await openPlanDetail(fetcher);

    expect(screen.getByText("−Bs 560")).toBeOnTheScreen();
    expect(screen.getByText("Bs 0")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Continuar al pago" }));

    await waitFor(() => {
      expect(screen.getByText("¡Pago confirmado!")).toBeOnTheScreen();
    });
    expect(purchased).toHaveBeenCalledWith({
      planId: "plan-8",
      startsOn: "2026-10-08",
    });
    expect(screen.getByText("Paquete de 8 clases")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Ir al inicio" })).toBeOnTheScreen();
  });

  it("explains a rejected transfer and offers a new receipt", async () => {
    const fetcher = routeFetcher({
      ...baseRoutes(0),
      "/api/v1/payments/current": () =>
        jsonResponse({
          ...payment,
          state: "rejected",
          decidedAt: "2026-09-21T17:00:00.000Z",
          rejectionReason: "El monto no coincide con el plan.",
        }),
      "/api/v1/notifications?limit=50": () =>
        jsonResponse({
          items: [
            {
              id: "n1",
              category: "subscription_payment",
              type: "payment_rejected",
              title: "Comprobante rechazado",
              message:
                "Tu comprobante fue rechazado: El monto no coincide con el plan. Sube uno nuevo para activar tu plan.",
              destinationType: "payment",
              destinationId: "payment-1",
              createdAt: "2026-09-21T17:00:00.000Z",
              readAt: null,
            },
          ],
          hasMore: false,
          nextCursor: null,
        }),
      "POST /api/v1/notifications/n1/read": () => jsonResponse({ marked: 1 }),
    });
    const screen = await render(<App runtime={createClientRuntime(fetcher)} />);
    await waitFor(
      () => {
        expect(screen.getByRole("button", { name: /Perfil/ })).toBeOnTheScreen();
      },
      { timeout: 10_000 },
    );
    await fireEvent.press(screen.getByRole("button", { name: /Perfil/ }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Notificaciones" })).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: "Notificaciones" }));
    await waitFor(() => {
      expect(screen.getByText(/Tu comprobante fue rechazado/)).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByText(/Tu comprobante fue rechazado/));

    await waitFor(() => {
      expect(screen.getByText("Tu comprobante fue rechazado")).toBeOnTheScreen();
    });
    expect(screen.getByText("El monto no coincide con el plan.")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Subir un nuevo comprobante" })).toBeOnTheScreen();
  });
});
