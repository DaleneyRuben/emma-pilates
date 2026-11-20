import { cleanup, fireEvent, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { jsonResponse } from "../test-support";
import { approvedOctober, draftNovember, openStatement } from "./staff-pay-test-support";

jest.setTimeout(20_000);

const november = {
  ...draftNovember,
  periodEnd: "2026-11-18",
  approvableOn: "2026-11-18",
  totalCentavos: 26_490,
  lines: [
    {
      kind: "class",
      detail: "mar 3 nov · 08:00 · Achumani · Mat Pilates · 1 clienta",
      amountCentavos: 6_500,
    },
    {
      kind: "minimum_not_met",
      detail: "lun 2 nov · 08:00 · Achumani · Mat Pilates",
      amountCentavos: 2_500,
    },
    {
      kind: "minimum_not_met",
      detail: "lun 2 nov · 18:00 · Norte · Reformer",
      amountCentavos: 2_500,
    },
    {
      kind: "minimum_not_met",
      detail: "mié 4 nov · 07:00 · Norte · Reformer",
      amountCentavos: 2_500,
    },
    {
      kind: "commission",
      detail: "Ana Rojas · Plan 30 días · 10 % de Bs 450",
      amountCentavos: 4_500,
    },
    {
      kind: "commission",
      detail: "Sara Paz · Plan 60 días · 10 % de Bs 799",
      amountCentavos: 7_990,
    },
  ],
};

const paidOctober = () =>
  jsonResponse([
    { id: "payment-october", amountCentavos: 32_200, paidOn: "2026-11-01", receiptUrl: null },
  ]);

// E2 B: the total in a Palo de rosa block with its state, then one Crema row
// per concept; a row opens that concept by day (board E2C).
describe("Staff statement by concept", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("puts the total and its state in the block and one row per concept under the bar", async () => {
    const screen = await openStatement("Liquidación del dom 1 nov – mar 17 nov", {
      statements: () => jsonResponse([november]),
      payments: () => jsonResponse([]),
    });

    const detail = within(screen.getByTestId("pay-statement"));
    const total = within(detail.getByTestId("pay-statement-total"));
    expect(total.getByText("Total")).toBeOnTheScreen();
    expect(total.getByText("Bs 264,90")).toHaveStyle({ fontSize: 34 });
    expect(total.getByText("En curso · se aprueba desde el mié 18 nov")).toBeOnTheScreen();
    // The payment strip still says where the money stands.
    expect(detail.getByText("Todavía sin aprobar")).toBeOnTheScreen();
    expect(detail.getByTestId("pay-proportions")).toBeOnTheScreen();

    const classes = within(detail.getByRole("button", { name: /^Clases dictadas,/ }));
    expect(classes.getByText("1 × Bs 65")).toBeOnTheScreen();
    expect(classes.getByText("Bs 65")).toBeOnTheScreen();
    const cancelled = within(detail.getByRole("button", { name: /^Canceladas por mínimo,/ }));
    expect(cancelled.getByText("3 × Bs 25")).toBeOnTheScreen();
    expect(cancelled.getByText("Bs 75")).toBeOnTheScreen();
    const commissions = within(detail.getByRole("button", { name: /^Comisiones de primer plan,/ }));
    expect(commissions.getByText("2 clientas nuevas")).toBeOnTheScreen();
    expect(commissions.getByText("Bs 124,90")).toBeOnTheScreen();
    expect(detail.getByText("Toca un grupo para ver cada clase con su fecha.")).toBeOnTheScreen();
  });

  it("opens a concept by day with each day's count and sum, and each class", async () => {
    const screen = await openStatement("Liquidación del dom 1 nov – mar 17 nov", {
      statements: () => jsonResponse([november]),
      payments: () => jsonResponse([]),
    });

    await fireEvent.press(screen.getByRole("button", { name: /^Canceladas por mínimo,/ }));

    const group = within(await waitFor(() => screen.getByTestId("pay-group")));
    expect(group.getByRole("header", { name: "Canceladas por mínimo" })).toBeOnTheScreen();
    expect(
      group.getByText("3 clases × Bs 25 = Bs 75. Se te pagan aunque no se llegue al mínimo."),
    ).toBeOnTheScreen();
    expect(group.getByText("lunes 2 nov")).toBeOnTheScreen();
    expect(group.getByText("2 · Bs 50")).toBeOnTheScreen();
    expect(group.getByText("miércoles 4 nov")).toBeOnTheScreen();
    expect(group.getByText("1 · Bs 25")).toBeOnTheScreen();
    expect(group.getAllByText("08:00")).toHaveLength(1);
    expect(group.getByText("18:00")).toBeOnTheScreen();
    expect(group.getAllByText("Reformer")).toHaveLength(2);
    expect(group.getAllByText("Norte")).toHaveLength(2);
    expect(group.getByText("Achumani")).toBeOnTheScreen();
    expect(group.getAllByText("Bs 25")).toHaveLength(3);

    await fireEvent.press(screen.getByRole("button", { name: "Volver" }));
    await waitFor(() => expect(screen.getByTestId("pay-statement")).toBeOnTheScreen());
  });

  it("lists commissions by Client and keeps what a taught class says", async () => {
    const screen = await openStatement("Liquidación del dom 1 nov – mar 17 nov", {
      statements: () => jsonResponse([november]),
      payments: () => jsonResponse([]),
    });

    await fireEvent.press(screen.getByRole("button", { name: /^Comisiones de primer plan,/ }));
    const commissions = within(await waitFor(() => screen.getByTestId("pay-group")));
    expect(commissions.getByText("Ana Rojas")).toBeOnTheScreen();
    expect(commissions.getByText("Plan 30 días · 10 % de Bs 450")).toBeOnTheScreen();
    expect(commissions.getByText("Bs 79,90")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Volver" }));
    await fireEvent.press(
      await waitFor(() => screen.getByRole("button", { name: /^Clases dictadas,/ })),
    );
    const classes = within(await waitFor(() => screen.getByTestId("pay-group")));
    expect(classes.getByText("martes 3 nov")).toBeOnTheScreen();
    expect(classes.getByText("Achumani · 1 clienta")).toBeOnTheScreen();
  });

  it("says a paid statement is paid and keeps its receipt strip", async () => {
    const screen = await openStatement("Liquidación de octubre 2026", {
      statements: () => jsonResponse([approvedOctober]),
      payments: paidOctober,
    });

    const detail = within(screen.getByTestId("pay-statement"));
    const total = within(detail.getByTestId("pay-statement-total"));
    expect(total.getByText("Bs 322")).toBeOnTheScreen();
    expect(total.getByText("Aprobada · pagada el dom 1 nov")).toBeOnTheScreen();
    expect(detail.getByText("Sin comprobante adjunto")).toBeOnTheScreen();
  });
});
