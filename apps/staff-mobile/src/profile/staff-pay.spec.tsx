import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";
import { approvedOctober, openMyPay, staffRoutes, trainerProfile } from "./staff-pay-test-support";

jest.setTimeout(20_000);

describe("Staff Mis pagos", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("sums each month by concept and lists the payments received", async () => {
    const screen = await openMyPay();

    const october = within(
      await waitFor(() => screen.getByLabelText("Liquidación de octubre 2026")),
    );
    expect(october.getByText("Octubre 2026")).toBeOnTheScreen();
    expect(october.getByText("Aprobado")).toBeOnTheScreen();
    expect(october.getByText("Bs 322,00")).toBeOnTheScreen();
    expect(october.getByText("Clases dictadas · 2")).toBeOnTheScreen();
    expect(october.getByText("Bs 146,00")).toBeOnTheScreen();
    expect(october.getByText("Canceladas por mínimo · 1")).toBeOnTheScreen();
    expect(october.getByText("Bs 25,00")).toBeOnTheScreen();
    expect(october.getByText("Comisiones · 1")).toBeOnTheScreen();
    expect(october.getByText("Bs 78,50")).toBeOnTheScreen();
    expect(october.queryByText("6 alumnas, 2 extra")).toBeNull();

    const payments = within(screen.getByLabelText("Pagos recibidos"));
    expect(payments.getByText("1 de noviembre de 2026 · sin comprobante")).toBeOnTheScreen();
    expect(payments.getByText("Bs 322,00")).toBeOnTheScreen();
  });

  it("keeps a line kind the app does not know in the summary", async () => {
    const screen = await openMyPay({
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

    const october = within(
      await waitFor(() => screen.getByLabelText("Liquidación de octubre 2026")),
    );
    expect(october.getByText("Otros · 1")).toBeOnTheScreen();
    expect(october.getByText("Bs 100,00")).toBeOnTheScreen();
  });

  it("opens and folds each class of a month", async () => {
    const screen = await openMyPay();

    const october = within(
      await waitFor(() => screen.getByLabelText("Liquidación de octubre 2026")),
    );
    await fireEvent.press(october.getByRole("button", { name: "Ver cada clase" }));

    expect(october.getAllByText("Clase")).toHaveLength(2);
    expect(october.getByText("3 alumnas")).toBeOnTheScreen();
    expect(october.getByText("6 alumnas, 2 extra")).toBeOnTheScreen();
    expect(october.getByText("Bs 81,00")).toBeOnTheScreen();
    expect(october.getByText("Clase cancelada por mínimo")).toBeOnTheScreen();
    expect(october.getByText("Mínimo no alcanzado")).toBeOnTheScreen();
    expect(october.getByText("Comisión")).toBeOnTheScreen();
    expect(october.getByText("Primer plan")).toBeOnTheScreen();

    await fireEvent.press(october.getByRole("button", { name: "Ocultar detalle" }));
    expect(october.queryByText("6 alumnas, 2 extra")).toBeNull();
    expect(october.getByRole("button", { name: "Ver cada clase" })).toBeOnTheScreen();
  });

  // v2 S29: the open month is the screen's one Rosa profundo card.
  it("puts the draft month on the hero card and the rest under «Liquidaciones anteriores»", async () => {
    const screen = await openMyPay();

    await waitFor(() => {
      expect(screen.getByText("Noviembre 2026")).toBeOnTheScreen();
    });
    const november = within(screen.getByLabelText("Liquidación de noviembre 2026"));
    expect(november.getByText("Borrador")).toBeOnTheScreen();
    expect(november.getByText("Bs 65,00")).toHaveStyle({ fontSize: 32 });
    expect(
      november.getByText("1 clase dictada · puede cambiar hasta que administración lo apruebe."),
    ).toBeOnTheScreen();
    expect(screen.getByText("Liquidaciones anteriores")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Volver" })).toBeNull();
  });

  it("says so when nothing was calculated or paid yet", async () => {
    const screen = await openMyPay({
      statements: () => jsonResponse([]),
      payments: () => jsonResponse([]),
    });

    await waitFor(() => {
      expect(screen.getByText("Todavía no tienes pagos")).toBeOnTheScreen();
    });
    expect(
      screen.getByText(
        "Aquí verás cada mes lo que te corresponde por tus clases y lo que se te pagó.",
      ),
    ).toBeOnTheScreen();
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
