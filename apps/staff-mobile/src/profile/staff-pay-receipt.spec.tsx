import { cleanup, fireEvent, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { jsonResponse } from "../test-support";
import { openMyPay } from "./staff-pay-test-support";

jest.setTimeout(20_000);

const receiptUrl = "/api/v1/trainer/salary-payments/payment-october/receipt";
const png = () =>
  new Response(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), {
    headers: { "Content-Type": "image/png" },
  });

const payments = () =>
  jsonResponse([
    { id: "payment-october", amountCentavos: 32_200, paidOn: "2026-11-01", receiptUrl },
    { id: "payment-hand", amountCentavos: 15_050, paidOn: "2026-10-15", receiptUrl: null },
  ]);

// BKO-008, S29: a payment with a receipt shows it; one without says so.
describe("Staff Mis pagos receipts", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("opens the receipt of a payment full screen", async () => {
    const asked: string[] = [];
    const screen = await openMyPay({
      payments,
      extra: {
        [`${receiptUrl}?variant=thumbnail`]: () => {
          asked.push("thumbnail");
          return png();
        },
        [`${receiptUrl}?variant=readable`]: () => {
          asked.push("readable");
          return png();
        },
      },
    });

    const received = within(await waitFor(() => screen.getByLabelText("Pagos recibidos")));
    const row = await waitFor(() =>
      received.getByRole("button", {
        name: "Ver el comprobante del pago del 1 de noviembre de 2026",
      }),
    );
    expect(within(row).getByText(/ · ver comprobante$/)).toBeOnTheScreen();
    expect(received.getByText(/ · sin comprobante$/)).toBeOnTheScreen();
    await waitFor(() => expect(asked).toContain("thumbnail"));

    await fireEvent.press(row);

    await waitFor(() => expect(asked).toContain("readable"));
    expect(
      await screen.findByText("Pago del 1 de noviembre de 2026", { includeHiddenElements: true }),
    ).toBeTruthy();
    expect(screen.getByTestId("full-screen-image")).toBeTruthy();
  });

  it("says so when the receipt cannot be shown, and tries again on a tap", async () => {
    let readable = 0;
    const screen = await openMyPay({
      payments,
      extra: {
        [`${receiptUrl}?variant=thumbnail`]: () => png(),
        [`${receiptUrl}?variant=readable`]: () => {
          readable += 1;
          return readable === 1
            ? jsonResponse({ code: "internal_error", status: 500 }, 500)
            : png();
        },
      },
    });

    const row = await waitFor(() =>
      screen.getByRole("button", {
        name: "Ver el comprobante del pago del 1 de noviembre de 2026",
      }),
    );
    await fireEvent.press(row);

    expect(await screen.findByText("No pudimos mostrar el comprobante.")).toBeOnTheScreen();
    await fireEvent.press(row);
    await waitFor(() => expect(readable).toBe(2));
    expect(
      await screen.findByText("Pago del 1 de noviembre de 2026", { includeHiddenElements: true }),
    ).toBeTruthy();
    expect(screen.queryByText("No pudimos mostrar el comprobante.")).toBeNull();
  });
});
