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
    expect(summary.getByText("Bs 65")).toHaveStyle({ fontSize: 36 });
    expect(
      summary.getByText(
        "1 clase dictada hasta hoy · puede cambiar hasta que administración lo apruebe.",
      ),
    ).toBeOnTheScreen();

    expect(screen.getByText("Historial")).toBeOnTheScreen();
    const november = within(
      screen.getByRole("button", { name: /^Liquidación de noviembre 2026,/ }),
    );
    expect(november.getByText("Noviembre 2026")).toBeOnTheScreen();
    expect(november.getByText("En curso · puede cambiar")).toBeOnTheScreen();
    const october = within(screen.getByRole("button", { name: /^Liquidación de octubre 2026,/ }));
    expect(october.getByText("Octubre 2026")).toBeOnTheScreen();
    expect(october.getByText("Pagado el dom 1 nov")).toBeOnTheScreen();
    expect(october.getByText("Bs 322")).toBeOnTheScreen();
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
    expect(summary.getByText("Bs 322")).toBeOnTheScreen();
    expect(
      summary.getByText("Liquidación de octubre 2026, ya aprobada. Falta el pago."),
    ).toBeOnTheScreen();
    const october = within(screen.getByRole("button", { name: /^Liquidación de octubre 2026,/ }));
    expect(october.getByText("Aprobada · por pagar")).toBeOnTheScreen();
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
    expect(summary.getByText("Bs 422")).toBeOnTheScreen();
    expect(summary.getByText("2 liquidaciones aprobadas. Falta el pago.")).toBeOnTheScreen();
  });

  it("shows the last payment when everything is paid", async () => {
    const screen = await openMyPay({
      statements: () => jsonResponse([approvedOctober]),
      payments: paidOctober,
    });

    const summary = within(await waitFor(() => screen.getByTestId("pay-summary")));
    expect(summary.getByText("Último pago · dom 1 nov")).toBeOnTheScreen();
    expect(summary.getByText("Bs 322")).toBeOnTheScreen();
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
    expect(others.getByText("jue 15 oct · sin comprobante")).toBeOnTheScreen();
    expect(others.queryByText("Bs 322")).toBeNull();
  });

  it("opens a statement with its payment, its sums by concept and each line", async () => {
    const screen = await openStatement("Liquidación de octubre 2026", {
      statements: () => jsonResponse([approvedOctober]),
      payments: paidOctober,
    });

    const detail = within(screen.getByTestId("pay-statement"));
    expect(detail.getByText("Liquidación")).toBeOnTheScreen();
    expect(detail.getByText("Octubre 2026")).toBeOnTheScreen();
    // E2 B: the state is a line in the Palo de rosa block, never a pill.
    const total = within(detail.getByTestId("pay-statement-total"));
    expect(total.getByText("Bs 322")).toHaveStyle({ fontSize: 36 });
    expect(total.getByText("Aprobada · pagada el dom 1 nov").parent).not.toHaveStyle({
      borderRadius: 999,
    });
    expect(detail.getByText("Pagado el dom 1 nov")).toBeOnTheScreen();
    expect(detail.getByText("Sin comprobante adjunto")).toBeOnTheScreen();
    expect(
      detail.getByRole("button", { name: "Clases dictadas, 2 clases, Bs 146" }),
    ).toBeOnTheScreen();
    expect(
      detail.getByRole("button", { name: "Canceladas por mínimo, 1 × Bs 25, Bs 25" }),
    ).toBeOnTheScreen();
    expect(
      detail.getByRole("button", {
        name: "Comisiones de primer plan, 1 clienta nueva, Bs 78,50",
      }),
    ).toBeOnTheScreen();
    expect(detail.queryByText("6 clientas, 2 extra")).toBeNull();

    // A statement drafted before its lines named the class lists them undated.
    await fireEvent.press(detail.getByRole("button", { name: /^Clases dictadas,/ }));
    const classes = within(await waitFor(() => screen.getByTestId("pay-group")));
    expect(classes.getByText("2 clases · Bs 146 en total.")).toBeOnTheScreen();
    expect(classes.getByText("6 clientas, 2 extra")).toBeOnTheScreen();
    expect(classes.getByText("Bs 81")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Volver" }));
    await fireEvent.press(
      await waitFor(() => screen.getByRole("button", { name: /^Canceladas por mínimo,/ })),
    );
    const cancelled = within(await waitFor(() => screen.getByTestId("pay-group")));
    expect(cancelled.getByText("Mínimo no alcanzado")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Volver" }));
    await waitFor(() => expect(screen.getByTestId("pay-statement")).toBeOnTheScreen());
    await fireEvent.press(screen.getByRole("button", { name: "Volver" }));
    await waitFor(() => expect(screen.getByTestId("pay-summary")).toBeOnTheScreen());
  });

  // Verification E2: 54 identical undated rows read as one row with the count.
  it("lists identical undated lines of a concept once, with their count and sum", async () => {
    const oldMinimums = {
      ...approvedOctober,
      totalCentavos: 135_000,
      lines: Array.from({ length: 54 }, () => ({
        kind: "minimum_not_met",
        detail: "Mínimo no alcanzado",
        amountCentavos: 2_500,
      })),
    };
    const screen = await openStatement("Liquidación de octubre 2026", {
      statements: () => jsonResponse([oldMinimums]),
      payments: paidOctober,
    });

    const detail = within(screen.getByTestId("pay-statement"));
    await fireEvent.press(detail.getByRole("button", { name: /^Canceladas por mínimo,/ }));
    const cancelled = within(await waitFor(() => screen.getByTestId("pay-group")));
    expect(cancelled.getAllByText("Mínimo no alcanzado")).toHaveLength(1);
    expect(cancelled.getByText("54 × Bs 25")).toBeOnTheScreen();
    expect(cancelled.getByText("Bs 1.350")).toBeOnTheScreen();
  });

  it("says an approved statement still waits for its payment, and an open one may change", async () => {
    const screen = await openStatement("Liquidación de octubre 2026", {
      statements: () =>
        jsonResponse([draftNovember, { ...approvedOctober, salaryPaymentId: null }]),
      payments: () => jsonResponse([]),
    });
    const october = within(screen.getByTestId("pay-statement"));
    expect(october.getByText("Aprobada · por pagar").parent).not.toHaveStyle({
      borderRadius: 999,
    });
    expect(october.getByText("Aprobada · falta el pago")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Volver" }));
    await fireEvent.press(
      await waitFor(() => screen.getByRole("button", { name: /^Liquidación de noviembre 2026,/ })),
    );
    const november = within(await waitFor(() => screen.getByTestId("pay-statement")));
    expect(november.getByText("Periodo en curso")).toBeOnTheScreen();
    // A statement without its approvable day (an older API) still says it may change.
    expect(november.getByText("En curso · puede cambiar")).toBeOnTheScreen();
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
              { kind: "class", detail: "3 clientas", amountCentavos: 6_500 },
              { kind: "holiday_bonus", detail: "Feriado", amountCentavos: 10_000 },
            ],
          },
        ]),
    });

    const detail = within(screen.getByTestId("pay-statement"));
    expect(detail.getByRole("button", { name: "Otros, Feriado, Bs 100" })).toBeOnTheScreen();
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
      expect(screen.getByText("lun 26 oct – dom 1 nov")).toBeOnTheScreen();
    });
    expect(screen.getByText("mar 20 oct")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: /^Liquidación del mar 20 oct,/ })).toBeOnTheScreen();
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
      expect(screen.getByText("Administradora")).toBeOnTheScreen();
    });
    expect(screen.queryByRole("button", { name: "Mis pagos" })).toBeNull();
  });
});
