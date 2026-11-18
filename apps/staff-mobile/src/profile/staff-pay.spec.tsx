import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";
import {
  approvedOctober,
  draftNovember,
  openMyPay,
  openStatement,
  staffRoutes,
  trainerProfile,
} from "./staff-pay-test-support";

jest.setTimeout(20_000);

const paidOctober = () =>
  jsonResponse([
    { id: "payment-october", amountCentavos: 32_200, paidOn: "2026-11-01", receiptUrl: null },
  ]);

// Finding 111 (proposal B): a summary on top, then one row per statement
// that opens its own screen.
describe("Staff Mis pagos", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("puts the open period on the summary and lists every statement under «Historial»", async () => {
    const screen = await openMyPay();

    const summary = within(await waitFor(() => screen.getByTestId("pay-summary")));
    expect(summary.getByText("En curso · Noviembre 2026")).toBeOnTheScreen();
    expect(summary.getByText("Bs 65,00")).toHaveStyle({ fontSize: 36 });
    expect(
      summary.getByText(
        "1 clase dictada hasta hoy · puede cambiar hasta que administración lo apruebe.",
      ),
    ).toBeOnTheScreen();

    expect(screen.getByText("Historial")).toBeOnTheScreen();
    const november = within(screen.getByRole("button", { name: "Liquidación de noviembre 2026" }));
    expect(november.getByText("Noviembre 2026")).toBeOnTheScreen();
    expect(november.getByText("En curso · puede cambiar")).toBeOnTheScreen();
    const october = within(screen.getByRole("button", { name: "Liquidación de octubre 2026" }));
    expect(october.getByText("Octubre 2026")).toBeOnTheScreen();
    expect(october.getByText("Pagado el 1 de noviembre")).toBeOnTheScreen();
    expect(october.getByText("Bs 322,00")).toBeOnTheScreen();
    // The payment lives on its statement's row, not in a list of its own.
    expect(screen.queryByText("Pagos recibidos")).toBeNull();
    expect(screen.queryByText("Otros pagos")).toBeNull();
  });

  it("shows what is owed first when a statement is approved but unpaid", async () => {
    const screen = await openMyPay({
      statements: () =>
        jsonResponse([draftNovember, { ...approvedOctober, salaryPaymentId: null }]),
      payments: () => jsonResponse([]),
    });

    const summary = within(await waitFor(() => screen.getByTestId("pay-summary")));
    expect(summary.getByText("Por cobrar")).toBeOnTheScreen();
    expect(summary.getByText("Bs 322,00")).toBeOnTheScreen();
    expect(
      summary.getByText("Liquidación de octubre 2026, ya aprobada. Falta el pago."),
    ).toBeOnTheScreen();
    const october = within(screen.getByRole("button", { name: "Liquidación de octubre 2026" }));
    expect(october.getByText("Aprobado · por pagar")).toBeOnTheScreen();
  });

  it("adds up several unpaid statements", async () => {
    const september = {
      ...approvedOctober,
      id: "statement-september",
      month: "2026-09-01",
      periodStart: "2026-09-01",
      periodEnd: "2026-10-01",
      totalCentavos: 10_000,
      salaryPaymentId: null,
    };
    const screen = await openMyPay({
      statements: () => jsonResponse([{ ...approvedOctober, salaryPaymentId: null }, september]),
      payments: () => jsonResponse([]),
    });

    const summary = within(await waitFor(() => screen.getByTestId("pay-summary")));
    expect(summary.getByText("Bs 422,00")).toBeOnTheScreen();
    expect(summary.getByText("2 liquidaciones aprobadas. Falta el pago.")).toBeOnTheScreen();
  });

  it("shows the last payment when everything is paid", async () => {
    const screen = await openMyPay({
      statements: () => jsonResponse([approvedOctober]),
      payments: paidOctober,
    });

    const summary = within(await waitFor(() => screen.getByTestId("pay-summary")));
    expect(summary.getByText("Último pago · 1 de noviembre")).toBeOnTheScreen();
    expect(summary.getByText("Bs 322,00")).toBeOnTheScreen();
    expect(
      summary.getByText("Liquidación de octubre 2026. Sin comprobante adjunto."),
    ).toBeOnTheScreen();
    expect(summary.queryByRole("button", { name: "Ver comprobante" })).toBeNull();
  });

  it("lists a payment with no statement under «Otros pagos»", async () => {
    const screen = await openMyPay({
      statements: () => jsonResponse([approvedOctober]),
      payments: () =>
        jsonResponse([
          { id: "payment-october", amountCentavos: 32_200, paidOn: "2026-11-01", receiptUrl: null },
          { id: "payment-hand", amountCentavos: 15_050, paidOn: "2026-10-15", receiptUrl: null },
        ]),
    });

    const others = within(await waitFor(() => screen.getByLabelText("Otros pagos")));
    expect(others.getByText("Bs 150,50")).toBeOnTheScreen();
    expect(others.getByText("15 de octubre de 2026 · sin comprobante")).toBeOnTheScreen();
    expect(others.queryByText("Bs 322,00")).toBeNull();
  });

  it("opens a statement with its payment, its sums by concept and each class", async () => {
    const screen = await openStatement("Liquidación de octubre 2026", {
      statements: () => jsonResponse([approvedOctober]),
      payments: paidOctober,
    });

    const detail = within(screen.getByTestId("pay-statement"));
    expect(detail.getByText("Liquidación")).toBeOnTheScreen();
    expect(detail.getByText("Octubre 2026")).toBeOnTheScreen();
    expect(detail.getByText("Pagado")).toBeOnTheScreen();
    expect(detail.getByText("Bs 322,00")).toHaveStyle({ fontSize: 34 });
    expect(detail.getByText("Pagado el 1 de noviembre")).toBeOnTheScreen();
    expect(detail.getByText("Sin comprobante adjunto")).toBeOnTheScreen();
    expect(detail.getByText("Clases dictadas · 2")).toBeOnTheScreen();
    expect(detail.getByText("Bs 146,00")).toBeOnTheScreen();
    expect(detail.getByText("Canceladas por mínimo · 1")).toBeOnTheScreen();
    expect(detail.getByText("Bs 25,00")).toBeOnTheScreen();
    expect(detail.getByText("Comisiones · 1")).toBeOnTheScreen();
    expect(detail.getByText("Bs 78,50")).toBeOnTheScreen();
    expect(detail.queryByText("6 alumnas, 2 extra")).toBeNull();

    await fireEvent.press(detail.getByRole("button", { name: "Ver cada clase" }));
    expect(detail.getAllByText("Clase")).toHaveLength(2);
    expect(detail.getByText("6 alumnas, 2 extra")).toBeOnTheScreen();
    expect(detail.getByText("Bs 81,00")).toBeOnTheScreen();
    expect(detail.getByText("Mínimo no alcanzado")).toBeOnTheScreen();
    expect(detail.getByText("Primer plan")).toBeOnTheScreen();
    await fireEvent.press(detail.getByRole("button", { name: "Ocultar detalle" }));
    expect(detail.queryByText("6 alumnas, 2 extra")).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: "Volver" }));
    await waitFor(() => expect(screen.getByTestId("pay-summary")).toBeOnTheScreen());
  });

  it("says an approved statement still waits for its payment, and an open one may change", async () => {
    const screen = await openStatement("Liquidación de octubre 2026", {
      statements: () =>
        jsonResponse([draftNovember, { ...approvedOctober, salaryPaymentId: null }]),
      payments: () => jsonResponse([]),
    });
    const october = within(screen.getByTestId("pay-statement"));
    expect(october.getByText("Por pagar")).toBeOnTheScreen();
    expect(october.getByText("Aprobado · falta el pago")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Volver" }));
    await fireEvent.press(
      await waitFor(() => screen.getByRole("button", { name: "Liquidación de noviembre 2026" })),
    );
    const november = within(await waitFor(() => screen.getByTestId("pay-statement")));
    expect(november.getByText("Periodo en curso")).toBeOnTheScreen();
    expect(november.getByText("En curso")).toBeOnTheScreen();
    expect(
      november.getByText("Puede cambiar hasta que administración lo apruebe."),
    ).toBeOnTheScreen();
  });

  it("keeps a line kind the app does not know in the sums", async () => {
    const screen = await openStatement("Liquidación de octubre 2026", {
      statements: () =>
        jsonResponse([
          {
            ...approvedOctober,
            totalCentavos: 16_500,
            lines: [
              { kind: "class", detail: "3 alumnas", amountCentavos: 6_500 },
              { kind: "holiday_bonus", detail: "Feriado", amountCentavos: 10_000 },
            ],
          },
        ]),
    });

    const detail = within(screen.getByTestId("pay-statement"));
    expect(detail.getByText("Otros · 1")).toBeOnTheScreen();
    expect(detail.getByText("Bs 100,00")).toBeOnTheScreen();
  });

  // BKO-009: a Trainer may be paid by day, week or range, not only by month.
  it("names a statement that is not a whole month by its days", async () => {
    const week = {
      ...approvedOctober,
      id: "statement-week",
      periodStart: "2026-10-26",
      periodEnd: "2026-11-02",
      salaryPaymentId: null,
    };
    const day = {
      ...week,
      id: "statement-day",
      periodStart: "2026-10-20",
      periodEnd: "2026-10-21",
    };
    const screen = await openMyPay({ statements: () => jsonResponse([week, day]) });

    await waitFor(() => {
      expect(screen.getByText("26 de octubre – 1 de noviembre de 2026")).toBeOnTheScreen();
    });
    expect(screen.getByText("20 de octubre de 2026")).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Liquidación del 20 de octubre de 2026" }),
    ).toBeOnTheScreen();
  });

  it("says so when nothing was calculated or paid yet", async () => {
    const screen = await openMyPay({
      statements: () => jsonResponse([]),
      payments: () => jsonResponse([]),
    });

    await waitFor(() => {
      expect(screen.getByText("Todavía no tienes pagos")).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: "Ver mi agenda" }));
    await waitFor(() => expect(screen.getByLabelText("Mi agenda")).toBeOnTheScreen());
  });

  it("offers a retry when the pay cannot load", async () => {
    let calls = 0;
    const screen = await openMyPay({
      statements: () => {
        calls += 1;
        return calls === 1
          ? jsonResponse({ code: "internal_error", status: 500 }, 500)
          : jsonResponse([approvedOctober]);
      },
    });

    await waitFor(() => {
      expect(screen.getByText("No pudimos cargar tus pagos.")).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: "Reintentar" }));
    await waitFor(() => {
      expect(screen.getByText("Octubre 2026")).toBeOnTheScreen();
    });
  });

  it("gives the row to a Trainer only", async () => {
    const screen = await render(
      <App
        runtime={createStaffRuntime(
          routeFetcher(staffRoutes({ ...trainerProfile, role: "administrator", branches: [] })),
          "administrator",
        )}
      />,
    );
    await waitFor(
      () => {
        expect(screen.getByTestId("tab-profile")).toBeOnTheScreen();
      },
      { timeout: 10_000 },
    );
    await fireEvent.press(screen.getByTestId("tab-profile"));
    await waitFor(() => {
      expect(screen.getByText("Administración")).toBeOnTheScreen();
    });
    expect(screen.queryByRole("button", { name: "Mis pagos" })).toBeNull();
  });
});
