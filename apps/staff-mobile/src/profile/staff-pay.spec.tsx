import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(20_000);

const trainerProfile = {
  id: "staff-1",
  name: "Emma Vargas",
  email: "emma.vargas@example.com",
  phone: null,
  role: "trainer",
  branches: [{ id: "branch-1", name: "Centro" }],
};

const approvedOctober = {
  id: "statement-october",
  staffMemberId: "staff-1",
  staffMemberName: "Emma Vargas",
  month: "2026-10-01",
  state: "approved",
  totalCentavos: 32_200,
  salaryPaymentId: "payment-october",
  lines: [
    { kind: "class", detail: "3 alumnas", amountCentavos: 6_500 },
    { kind: "class", detail: "6 alumnas, 2 extra", amountCentavos: 8_100 },
    { kind: "minimum_not_met", detail: "Mínimo no alcanzado", amountCentavos: 2_500 },
    { kind: "commission", detail: "Primer plan", amountCentavos: 7_850 },
  ],
};

const draftNovember = {
  ...approvedOctober,
  id: "statement-november",
  month: "2026-11-01",
  state: "draft",
  totalCentavos: 6_500,
  salaryPaymentId: null,
  lines: [{ kind: "class", detail: "4 alumnas", amountCentavos: 6_500 }],
};

type PayRoutes = { statements?: () => Response; payments?: () => Response };

function staffRoutes(profile: unknown, pay: PayRoutes = {}) {
  return {
    "/api/v1/trainer/sessions": () => jsonResponse([]),
    "/api/v1/staff-members/current": () => jsonResponse(profile),
    "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
    "/api/v1/trainer/pay-statements":
      pay.statements ?? (() => jsonResponse([draftNovember, approvedOctober])),
    "/api/v1/trainer/salary-payments":
      pay.payments ??
      (() =>
        jsonResponse([{ id: "payment-october", amountCentavos: 32_200, paidOn: "2026-11-01" }])),
  };
}

async function openMyPay(pay: PayRoutes = {}) {
  const screen = await render(
    <App runtime={createStaffRuntime(routeFetcher(staffRoutes(trainerProfile, pay)))} />,
  );
  await waitFor(
    () => {
      expect(screen.getByText("EV")).toBeOnTheScreen();
    },
    { timeout: 10_000 },
  );
  await fireEvent.press(screen.getByRole("button", { name: /^Tu cuenta/ }));
  await waitFor(() => {
    expect(screen.getByRole("button", { name: "Mis pagos" })).toBeOnTheScreen();
  });
  await fireEvent.press(screen.getByRole("button", { name: "Mis pagos" }));
  return screen;
}

describe("Staff Mis pagos", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("shows each month's statement with its lines and the payments received", async () => {
    const screen = await openMyPay();

    const october = within(
      await waitFor(() => screen.getByLabelText("Liquidación de octubre 2026")),
    );
    expect(october.getByText("Octubre 2026")).toBeOnTheScreen();
    expect(october.getByText("Aprobado")).toBeOnTheScreen();
    expect(october.getByText("Bs 322,00")).toBeOnTheScreen();
    expect(october.getAllByText("Clase")).toHaveLength(2);
    expect(october.getByText("3 alumnas")).toBeOnTheScreen();
    expect(october.getByText("6 alumnas, 2 extra")).toBeOnTheScreen();
    expect(october.getByText("Bs 81,00")).toBeOnTheScreen();
    expect(october.getByText("Clase cancelada por mínimo")).toBeOnTheScreen();
    expect(october.getByText("Bs 25,00")).toBeOnTheScreen();
    expect(october.getByText("Comisión")).toBeOnTheScreen();
    expect(october.getByText("Primer plan")).toBeOnTheScreen();
    expect(october.getByText("Bs 78,50")).toBeOnTheScreen();

    const payments = within(screen.getByLabelText("Pagos recibidos"));
    expect(payments.getByText("1 de noviembre de 2026")).toBeOnTheScreen();
    expect(payments.getByText("Bs 322,00")).toBeOnTheScreen();
  });

  it("lists the newest month first and marks a draft as still open", async () => {
    const screen = await openMyPay();

    await waitFor(() => {
      expect(screen.getByText("Noviembre 2026")).toBeOnTheScreen();
    });
    const months = screen
      .getAllByText(/^(Noviembre|Octubre) 2026$/)
      .map((node) => node.props.children);
    expect(months).toEqual(["Noviembre 2026", "Octubre 2026"]);
    const november = within(screen.getByLabelText("Liquidación de noviembre 2026"));
    expect(november.getByText("Borrador")).toBeOnTheScreen();
    expect(
      november.getByText("Puede cambiar hasta que administración lo apruebe."),
    ).toBeOnTheScreen();
  });

  it("says so when nothing was calculated or paid yet", async () => {
    const screen = await openMyPay({
      statements: () => jsonResponse([]),
      payments: () => jsonResponse([]),
    });

    await waitFor(() => {
      expect(screen.getByText("Todavía no tienes pagos.")).toBeOnTheScreen();
    });
    expect(
      screen.getByText("Aquí verás cada mes lo que te corresponde y lo que se te pagó."),
    ).toBeOnTheScreen();
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
        expect(screen.getByText("EV")).toBeOnTheScreen();
      },
      { timeout: 10_000 },
    );
    await fireEvent.press(screen.getByRole("button", { name: /^Tu cuenta/ }));
    await waitFor(() => {
      expect(screen.getByText("Administración")).toBeOnTheScreen();
    });
    expect(screen.queryByRole("button", { name: "Mis pagos" })).toBeNull();
  });
});
