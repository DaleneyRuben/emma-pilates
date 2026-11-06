import { cleanup, fireEvent, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { openProfile, readRoutes } from "../profile/profile-test-support";
import { clientNotificationDestination } from "../notifications/notification-destinations";
import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";

const mockDownloadInvoice = jest.fn();
jest.mock("./invoice-download", () => ({
  downloadInvoice: (...args: unknown[]) => mockDownloadInvoice(...args),
}));

jest.setTimeout(20_000);

const ready = {
  paymentId: "payment-1",
  purchaseLabel: "Paquete de 8 clases",
  amountDueCentavos: 50_200,
  paidAt: "2026-11-05T13:30:00.000Z",
  state: "ready",
  voided: false,
  invoiceData: { taxId: "123456", name: "Mariana Quiroga" },
  file: {
    fileName: "factura-000123.pdf",
    mediaType: "application/pdf",
    byteSize: 248_000,
    uploadedAt: "2026-11-05T14:42:00.000Z",
  },
};
const preparing = {
  ...ready,
  paymentId: "payment-2",
  purchaseLabel: "Evaluación nutricional",
  amountDueCentavos: 12_000,
  paidAt: "2026-11-03T13:30:00.000Z",
  state: "preparing",
  file: null,
};
const voided = {
  ...ready,
  paymentId: "payment-3",
  paidAt: "2026-10-06T13:30:00.000Z",
  voided: true,
};

const openInvoices = async (items: unknown[]) => {
  const screen = await openProfile(
    createClientRuntime(
      routeFetcher({
        ...readRoutes,
        "/api/v1/clients/current/invoices": () => jsonResponse({ items }),
      }),
    ),
  );
  await fireEvent.press(screen.getByRole("button", { name: "Mis facturas" }));
  return screen;
};

// FIX-044 (follow-up 248, K1–K3): the Client's invoices in Perfil.
describe("Mis facturas", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
    mockDownloadInvoice.mockReset();
  });

  it("says she has none yet", async () => {
    const screen = await openInvoices([]);

    expect(await screen.findByText("Aún no tienes facturas")).toBeOnTheScreen();
    expect(
      screen.getByText("Cuando pidas factura al pagar, el estudio la sube aquí y te avisamos."),
    ).toBeOnTheScreen();
  });

  it("lists ready, in-preparation and voided invoices", async () => {
    const screen = await openInvoices([ready, preparing, voided]);

    expect(
      await screen.findByRole("button", { name: /Paquete de 8 clases, 5 nov 2026, Bs 502, Lista/ }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("button", {
        name: /Evaluación nutricional, 3 nov 2026, Bs 120, En preparación/,
      }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: /Paquete de 8 clases, 6 oct 2026, Bs 502, Pago anulado/ }),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        "Las facturas salen a nombre del NIT o CI que diste al pagar. Si un dato está mal, avísale al estudio.",
      ),
    ).toBeOnTheScreen();
  });

  it("opens an invoice and downloads it", async () => {
    mockDownloadInvoice.mockResolvedValue("shared");
    const screen = await openInvoices([ready]);

    await fireEvent.press(
      await screen.findByRole("button", { name: /Paquete de 8 clases, 5 nov 2026/ }),
    );
    expect(await screen.findByText("Mariana Quiroga")).toBeOnTheScreen();
    expect(screen.getByText("123456")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Descargar" }));

    await waitFor(() => expect(mockDownloadInvoice).toHaveBeenCalledTimes(1));
    expect(mockDownloadInvoice.mock.calls[0][0]).toMatchObject({
      paymentId: "payment-1",
      fileName: "factura-000123.pdf",
      mediaType: "application/pdf",
    });
  });

  it("says so when the download fails", async () => {
    mockDownloadInvoice.mockRejectedValue(new Error("offline"));
    const screen = await openInvoices([ready]);

    await fireEvent.press(
      await screen.findByRole("button", { name: /Paquete de 8 clases, 5 nov 2026/ }),
    );
    await fireEvent.press(await screen.findByRole("button", { name: "Descargar" }));

    expect(
      await screen.findByText("No pudimos descargar la factura. Inténtalo de nuevo."),
    ).toBeOnTheScreen();
  });

  it("tells her when an invoice is still being prepared", async () => {
    const screen = await openInvoices([preparing]);

    await fireEvent.press(
      await screen.findByRole("button", { name: /Evaluación nutricional, 3 nov 2026/ }),
    );

    expect(await screen.findByText("El estudio está preparando tu factura")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Descargar" })).toBeNull();
  });

  it("opens Mis facturas from the «Tu factura está lista» notification", () => {
    expect(clientNotificationDestination("invoice")).toEqual([
      "ProfileTab",
      { screen: "MyInvoices" },
    ]);
  });
});
