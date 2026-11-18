import { cleanup, fireEvent, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { jsonResponse } from "../test-support";
import { approvedOctober, openMyPay, openStatement } from "./staff-pay-test-support";

jest.setTimeout(20_000);

const receiptUrl = "/api/v1/trainer/salary-payments/payment-october/receipt";
const handUrl = "/api/v1/trainer/salary-payments/payment-hand/receipt";
const png = () =>
  new Response(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), {
    headers: { "Content-Type": "image/png" },
  });

const statements = () => jsonResponse([approvedOctober]);
const payments = () =>
  jsonResponse([
    { id: "payment-october", amountCentavos: 32_200, paidOn: "2026-11-01", receiptUrl },
    { id: "payment-hand", amountCentavos: 15_050, paidOn: "2026-10-15", receiptUrl: handUrl },
  ]);

function receiptRoutes(asked: string[], readable: () => Response = png) {
  return {
    [`${receiptUrl}?variant=thumbnail`]: () => {
      asked.push("thumbnail");
      return png();
    },
    [`${receiptUrl}?variant=readable`]: () => {
      asked.push("readable");
      return readable();
    },
    [`${handUrl}?variant=thumbnail`]: () => png(),
    [`${handUrl}?variant=readable`]: () => {
      asked.push("hand");
      return png();
    },
  };
}

// BKO-008, finding 111: a payment with a receipt shows it wherever it appears.
describe("Staff Mis pagos receipts", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("opens the last payment's receipt from the summary", async () => {
    const asked: string[] = [];
    const screen = await openMyPay({ statements, payments, extra: receiptRoutes(asked) });

    const summary = within(await waitFor(() => screen.getByTestId("pay-summary")));
    expect(summary.getByText("Liquidación de octubre 2026.")).toBeOnTheScreen();
    await fireEvent.press(summary.getByRole("button", { name: "Ver comprobante" }));

    await waitFor(() => expect(asked).toContain("readable"));
    expect(
      await screen.findByText("Pago del 1 de noviembre de 2026", { includeHiddenElements: true }),
    ).toBeTruthy();
    expect(screen.getByTestId("full-screen-image")).toBeTruthy();
  });

  it("opens a statement's receipt from its payment", async () => {
    const asked: string[] = [];
    const screen = await openStatement("Liquidación de octubre 2026", {
      statements,
      payments,
      extra: receiptRoutes(asked),
    });

    const detail = within(screen.getByTestId("pay-statement"));
    const strip = detail.getByRole("button", {
      name: "Ver el comprobante del pago del 1 de noviembre de 2026",
    });
    expect(within(strip).getByText("Pagado el 1 de noviembre")).toBeOnTheScreen();
    expect(within(strip).getByText("Ver comprobante")).toBeOnTheScreen();
    await waitFor(() => expect(asked).toContain("thumbnail"));

    await fireEvent.press(strip);

    await waitFor(() => expect(asked).toContain("readable"));
    expect(
      await screen.findByText("Pago del 1 de noviembre de 2026", { includeHiddenElements: true }),
    ).toBeTruthy();
  });

  it("says so when the receipt cannot be shown, and tries again on a tap", async () => {
    const asked: string[] = [];
    let readable = 0;
    const screen = await openStatement("Liquidación de octubre 2026", {
      statements,
      payments,
      extra: receiptRoutes(asked, () => {
        readable += 1;
        return readable === 1 ? jsonResponse({ code: "internal_error", status: 500 }, 500) : png();
      }),
    });

    const strip = screen.getByRole("button", {
      name: "Ver el comprobante del pago del 1 de noviembre de 2026",
    });
    await fireEvent.press(strip);

    expect(await screen.findByText("No pudimos mostrar el comprobante.")).toBeOnTheScreen();
    await fireEvent.press(strip);
    await waitFor(() => expect(readable).toBe(2));
    expect(
      await screen.findByText("Pago del 1 de noviembre de 2026", { includeHiddenElements: true }),
    ).toBeTruthy();
    expect(screen.queryByText("No pudimos mostrar el comprobante.")).toBeNull();
  });

  it("opens the receipt of a payment with no statement", async () => {
    const asked: string[] = [];
    const screen = await openMyPay({ statements, payments, extra: receiptRoutes(asked) });

    const others = within(await waitFor(() => screen.getByLabelText("Otros pagos")));
    const row = others.getByRole("button", {
      name: "Ver el comprobante del pago del 15 de octubre de 2026",
    });
    expect(within(row).getByText(/ · ver comprobante$/)).toBeOnTheScreen();
    await fireEvent.press(row);

    await waitFor(() => expect(asked).toContain("hand"));
    expect(
      await screen.findByText("Pago del 15 de octubre de 2026", { includeHiddenElements: true }),
    ).toBeTruthy();
  });
});
