import {
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";

import App from "../../App";
import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(30_000);

const profile = {
  id: "client-1",
  name: "Mariana Peña",
  email: "mariana@example.com",
  phone: null,
  referralCode: "REF-MARIANA",
};
const plan = {
  id: "plan-8",
  name: "Paquete de 8 clases",
  durationMonths: 1,
  classAllowance: 8,
  priceCentavos: 56_000,
};
const intent = {
  id: "intent-1",
  planId: plan.id,
  planName: plan.name,
  durationMonths: 1,
  classAllowance: 8,
  planPriceCentavos: 56_000,
  creditReservedCentavos: 6000,
  amountDueCentavos: 50_000,
  state: "open",
  receiptAttached: false,
  createdAt: "2026-09-21T15:00:00.000Z",
  expiresAt: "2026-09-22T15:00:00.000Z",
};
const payment = {
  id: "payment-1",
  method: "transfer",
  state: "pending",
  planId: plan.id,
  planName: plan.name,
  durationMonths: 1,
  classAllowance: 8,
  planPriceCentavos: 56_000,
  creditAppliedCentavos: 6000,
  amountDueCentavos: 50_000,
  submittedAt: "2026-09-21T16:00:00.000Z",
  decidedAt: null,
  rejectionReason: null,
  subscriptionId: null,
};
const instructions = {
  beneficiaryName: "Emma Pilates Studio",
  bankName: "Banco Local",
  accountNumber: "0000000000",
  qrImageUrl: "/api/v1/transfer-instructions/qr",
};
const receiptBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

const baseRoutes = (credit: number) => ({
  "/api/v1/clients/current": () => jsonResponse(profile),
  "/api/v1/clients/current/subscription": () =>
    jsonResponse({ status: "none", subscription: null }),
  "/api/v1/clients/current/credit": () =>
    jsonResponse({ availableCentavos: credit, reservedCentavos: 0, activity: [] }),
  "/api/v1/plans": () => jsonResponse([plan]),
  "/api/v1/plans/plan-8": () => jsonResponse(plan),
  "/api/v1/transfer-instructions": () => jsonResponse(instructions),
  "/api/v1/transfer-instructions/qr": () =>
    new Response(receiptBytes, {
      status: 200,
      headers: { "Content-Type": "image/png" },
    }),
  "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
});

async function openPlanDetail(fetcher: ReturnType<typeof routeFetcher>) {
  const screen = await render(<App runtime={createClientRuntime(fetcher)} />);
  await waitFor(
    () => {
      expect(screen.getByRole("button", { name: "Comprar un plan" })).toBeOnTheScreen();
    },
    { timeout: 10_000 },
  );
  fireEvent.press(screen.getByRole("button", { name: "Comprar un plan" }));
  await waitFor(() => {
    expect(screen.getByRole("button", { name: "Paquete de 8 clases" })).toBeOnTheScreen();
  });
  fireEvent.press(screen.getByRole("button", { name: "Paquete de 8 clases" }));
  await waitFor(() => {
    expect(screen.getByText("Total a pagar")).toBeOnTheScreen();
  });
  return screen;
}

describe("Client purchase flow", () => {
  afterEach(() => {
    cleanup();
    clearMobileQueryCache();
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockReset();
    jest.mocked(FileSystem.readAsStringAsync).mockReset();
  });

  it("applies available Credit on the Plan detail and opens the transfer payment", async () => {
    const created = jest.fn();
    const fetcher = routeFetcher({
      ...baseRoutes(6000),
      "POST /api/v1/purchase-intents": (init) => {
        created(init?.headers, JSON.parse(String(init?.body)));
        return jsonResponse(intent, 201);
      },
    });
    const screen = await openPlanDetail(fetcher);

    expect(screen.getByText("Crédito aplicado")).toBeOnTheScreen();
    expect(screen.getByText("−Bs 60")).toBeOnTheScreen();
    expect(screen.getByText("Bs 500")).toBeOnTheScreen();

    fireEvent.press(screen.getByRole("button", { name: "Continuar al pago" }));

    await waitFor(() => {
      expect(screen.getByText("Pago por transferencia")).toBeOnTheScreen();
    });
    expect(created).toHaveBeenCalledWith(
      expect.objectContaining({ "idempotency-key": expect.any(String) }),
      { planId: "plan-8" },
    );
    expect(screen.getAllByText("Bs 500").length).toBeGreaterThan(0);
    expect(
      screen.getByText("Escanea el código con tu app bancaria y transfiere el monto exacto."),
    ).toBeOnTheScreen();
    expect(screen.getByText("Emma Pilates Studio")).toBeOnTheScreen();
    await waitFor(() => {
      expect(screen.getByLabelText("Código QR del estudio")).toBeOnTheScreen();
    });
    expect(
      screen.getByRole("button", { name: "Enviar comprobante" }),
    ).toHaveProp("accessibilityState", { disabled: true });
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
      .mocked(FileSystem.readAsStringAsync)
      .mockResolvedValue(Buffer.from(receiptBytes).toString("base64"));
    const calls: string[] = [];
    let statusReads = 0;
    const fetcher = routeFetcher({
      ...baseRoutes(6000),
      "POST /api/v1/purchase-intents": () => jsonResponse(intent, 201),
      "POST /api/v1/uploads": (init) => {
        calls.push(`upload ${String(init?.body)}`);
        return jsonResponse(
          { id: "asset-1", uploadUrl: "/api/v1/uploads/asset-1/object", expiresAt: "2026-09-21T15:15:00.000Z" },
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
          mediaType: "image/png",
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
    fireEvent.press(screen.getByRole("button", { name: "Continuar al pago" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Sube tu comprobante de transferencia" })).toBeOnTheScreen();
    });

    fireEvent.press(screen.getByRole("button", { name: "Sube tu comprobante de transferencia" }));

    await waitFor(
      () => {
        expect(screen.getByRole("button", { name: "Enviar comprobante" })).toHaveProp(
          "accessibilityState",
          { disabled: false },
        );
      },
      { timeout: 10_000 },
    );
    const checksum = require("node:crypto")
      .createHash("sha256")
      .update(Buffer.from(receiptBytes))
      .digest("base64");
    expect(calls).toEqual([
      `upload ${JSON.stringify({ purpose: "transfer_receipt", mediaType: "image/png", byteSize: 8, checksum })}`,
      "put image/png",
      "finalize",
      `attach ${JSON.stringify({ imageAssetId: "asset-1" })}`,
    ]);
    expect(screen.getByLabelText("Comprobante adjunto")).toBeOnTheScreen();

    fireEvent.press(screen.getByRole("button", { name: "Enviar comprobante" }));

    await waitFor(() => {
      expect(screen.getByText("Tu pago está en revisión")).toBeOnTheScreen();
    });
    expect(calls.at(-1)).toBe("submit");
    expect(
      screen.getByText(
        "Un administrador va a confirmar tu comprobante pronto. Te avisaremos apenas esté listo.",
      ),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByRole("button", { name: "Volver al inicio" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Comprar un plan" })).toBeOnTheScreen();
    });
  });

  it("activates immediately through Credit when it covers the whole Plan", async () => {
    const purchased = jest.fn();
    const fetcher = routeFetcher({
      ...baseRoutes(60_000),
      "POST /api/v1/credit-purchases": (init) => {
        purchased(JSON.parse(String(init?.body)));
        return jsonResponse(
          {
            ...payment,
            method: "credit_only",
            state: "confirmed",
            creditAppliedCentavos: 56_000,
            amountDueCentavos: 0,
            decidedAt: "2026-09-21T16:00:00.000Z",
            subscriptionId: "subscription-1",
          },
          201,
        );
      },
    });
    const screen = await openPlanDetail(fetcher);

    expect(screen.getByText("−Bs 560")).toBeOnTheScreen();
    expect(screen.getByText("Bs 0")).toBeOnTheScreen();
    fireEvent.press(screen.getByRole("button", { name: "Continuar al pago" }));

    await waitFor(() => {
      expect(screen.getByText("¡Pago confirmado!")).toBeOnTheScreen();
    });
    expect(purchased).toHaveBeenCalledWith({ planId: "plan-8" });
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
              message: "Tu comprobante fue rechazado: El monto no coincide con el plan. Sube uno nuevo para activar tu plan.",
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
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Perfil/ })).toBeOnTheScreen();
    }, { timeout: 10_000 });
    fireEvent.press(screen.getByRole("button", { name: /Perfil/ }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Notificaciones" })).toBeOnTheScreen();
    });
    fireEvent.press(screen.getByRole("button", { name: "Notificaciones" }));
    await waitFor(() => {
      expect(screen.getByText(/Tu comprobante fue rechazado/)).toBeOnTheScreen();
    });
    fireEvent.press(screen.getByText(/Tu comprobante fue rechazado/));

    await waitFor(() => {
      expect(screen.getByText("Tu comprobante fue rechazado")).toBeOnTheScreen();
    });
    expect(screen.getByText("El monto no coincide con el plan.")).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Subir un nuevo comprobante" }),
    ).toBeOnTheScreen();
  });
});
