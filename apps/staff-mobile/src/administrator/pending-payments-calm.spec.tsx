import { cleanup, render, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(20_000);

const administrator = {
  id: "staff-2",
  name: "Ana Méndez",
  email: "ana@example.com",
  phone: null,
  role: "administrator",
  branches: [],
};

async function openPayments(pending: unknown[]) {
  const screen = await render(
    <App
      runtime={createStaffRuntime(
        routeFetcher({
          "/api/v1/staff-members/current": () => jsonResponse(administrator),
          "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
          "/api/v1/administrator/payments/pending": () => jsonResponse(pending),
        }),
        "administrator",
      )}
    />,
  );
  await waitFor(() => expect(screen.getByTestId("cash-close-entry")).toBeOnTheScreen(), {
    timeout: 10_000,
  });
  return screen;
}

describe("Pagos pendientes, one line a day (FIX-083, Ronda 2 pick A)", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("says «Todo al día» in one small card instead of the big empty state", async () => {
    const screen = await openPayments([]);

    const card = screen.getByTestId("pending-payments-all-clear");
    expect(card).toHaveProp("accessible", true);
    expect(within(card).getByText("Todo al día")).toBeOnTheScreen();
    expect(within(card).getByText("No hay pagos por confirmar")).toBeOnTheScreen();
    expect(screen.queryByText("Ver el horario")).toBeNull();
    expect(screen.queryByTestId("state-screen-disc")).toBeNull();
  });

  it("lists the shortcuts as plain rows without icon discs", async () => {
    const screen = await openPayments([]);

    expect(screen.queryByTestId("icon-row-disc")).toBeNull();
    for (const label of [
      "Facturas por subir",
      "Cancelar una clase",
      "Congelamientos",
      "Cerrar caja",
    ]) {
      expect(screen.getByRole("button", { name: label })).toBeOnTheScreen();
    }
  });
});
