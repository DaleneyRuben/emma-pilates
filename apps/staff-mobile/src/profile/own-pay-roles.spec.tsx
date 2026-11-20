import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";
import { approvedOctober, staffRoutes, trainerProfile } from "./staff-pay-test-support";

jest.setTimeout(30_000);

type PaidRole = "coordinator" | "nutritionist" | "assistant";

const profiles: Record<PaidRole, unknown> = {
  coordinator: {
    ...trainerProfile,
    name: "Carolina Rivas",
    role: "coordinator",
    branches: [
      { id: "branch-1", name: "Centro" },
      { id: "branch-2", name: "Norte" },
    ],
  },
  nutritionist: { ...trainerProfile, name: "Gabriela Flores", role: "nutritionist" },
  assistant: { ...trainerProfile, name: "Camila Rojas", role: "assistant" },
};

const coordinatorOctober = {
  ...approvedOctober,
  staffMemberName: "Carolina Rivas",
  totalCentavos: 378_000,
  lines: [
    { kind: "base", detail: "Base", amountCentavos: 350_000 },
    { kind: "new_client", detail: "Ana Rojas · Plan 30 días · 30 días", amountCentavos: 5_000 },
    { kind: "bonus", detail: "Bono de renovación", amountCentavos: 23_000 },
  ],
};
const handPayment = {
  id: "payment-hand",
  amountCentavos: 41_000,
  paidOn: "2026-11-02",
  receiptUrl: null,
};

async function openApp(role: PaidRole, pay: Parameters<typeof staffRoutes>[1] = {}) {
  const screen = await render(
    <App
      runtime={createStaffRuntime(
        routeFetcher({
          ...staffRoutes(profiles[role], pay),
          "/api/v1/staff-members/current/payout-qr": () =>
            jsonResponse({ payoutQr: { standing: "valid", validUntil: "2026-12-16" } }),
        }),
        role,
      )}
    />,
  );
  await waitFor(() => expect(screen.getByTestId("tab-profile")).toBeOnTheScreen(), {
    timeout: 10_000,
  });
  return screen;
}

// E8: «Mis pagos» for everyone who is paid. The Coordinator and the
// Nutritionist get a tab (A); the Assistant, whose bar is full, gets rows in
// Perfil (B).
describe("Mis pagos for every paid Role", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("gives the Coordinator a «Mis pagos» tab with her months and her QR", async () => {
    const screen = await openApp("coordinator", {
      statements: () => jsonResponse([coordinatorOctober]),
      payments: () =>
        jsonResponse([{ ...handPayment, id: "payment-october", amountCentavos: 378_000 }]),
    });

    await fireEvent.press(screen.getByTestId("tab-pay"));

    const summary = within(await waitFor(() => screen.getByTestId("pay-summary")));
    expect(summary.getByText("Bs 3.780")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: /^Liquidación de octubre 2026,/ })).toBeOnTheScreen();
    await fireEvent.press(
      await waitFor(() => screen.getByRole("button", { name: /^Mi QR de cobro, Vale hasta el / })),
    );
    await waitFor(() =>
      expect(screen.getByRole("header", { name: "Mi QR de cobro" })).toBeOnTheScreen(),
    );
  });

  it("keeps everything the Coordinator's Perfil had and adds «Mis pagos»", async () => {
    const screen = await openApp("coordinator");

    await fireEvent.press(screen.getByTestId("tab-profile"));
    await waitFor(() => expect(screen.getByText("Coordinadora")).toBeOnTheScreen());
    expect(screen.getByText("Cambiar foto")).toBeOnTheScreen();
    expect(screen.getByText("Sucursales")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Enviar comentarios" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: /^Mi QR de cobro/ })).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId("profile-my-pay"));
    await waitFor(() => expect(screen.getByTestId("pay-summary")).toBeOnTheScreen());
  });

  it("gives the Nutritionist a «Mis pagos» tab that lists the payments logged for her", async () => {
    const screen = await openApp("nutritionist", {
      statements: () => jsonResponse([]),
      payments: () => jsonResponse([handPayment]),
    });

    await fireEvent.press(screen.getByTestId("tab-pay"));

    const summary = within(await waitFor(() => screen.getByTestId("pay-summary")));
    expect(summary.getByText("Último pago · lun 2 nov")).toBeOnTheScreen();
    // With no statements the list is simply her payments.
    const payments = within(screen.getByLabelText("Pagos"));
    expect(payments.getByText("Bs 410")).toBeOnTheScreen();
    expect(screen.queryByText("Otros pagos")).toBeNull();
  });

  it("says so when nobody has paid her yet, without the Trainer's agenda", async () => {
    const screen = await openApp("coordinator", {
      statements: () => jsonResponse([]),
      payments: () => jsonResponse([]),
    });

    await fireEvent.press(screen.getByTestId("tab-pay"));

    await waitFor(() => expect(screen.getByText("Todavía no tienes pagos")).toBeOnTheScreen());
    expect(
      screen.getByText("Aquí verás cada mes lo que te corresponde y lo que se te pagó."),
    ).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Ver mi agenda" })).toBeNull();
  });

  it("puts «Mis pagos» and «Mi QR de cobro» in the Assistant's Perfil, with no new tab", async () => {
    const screen = await openApp("assistant", {
      statements: () => jsonResponse([]),
      payments: () => jsonResponse([handPayment]),
    });

    expect(screen.queryByTestId("tab-pay")).toBeNull();
    await fireEvent.press(screen.getByTestId("tab-profile"));
    await waitFor(() => expect(screen.getByText("Asistente")).toBeOnTheScreen());
    expect(screen.getByText("Cambiar foto")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Enviar comentarios" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: /^Mi QR de cobro/ })).toBeOnTheScreen();

    await fireEvent.press(
      await waitFor(() => screen.getByRole("button", { name: "Mis pagos, Último: Bs 410" })),
    );

    await waitFor(() => expect(screen.getByTestId("pay-summary")).toBeOnTheScreen());
    expect(within(screen.getByLabelText("Pagos")).getByText("Bs 410")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Volver" }));
    await waitFor(() => expect(screen.getByText("Asistente")).toBeOnTheScreen());
  });
});
