import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { assistantRoutes, openClientSearch } from "../assistant/assistant-fixtures";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(20_000);

const centroToday = "/api/v1/cash-closes/today?branchId=branch-centro";
const today = {
  branchId: "branch-centro",
  businessDate: "2026-10-23",
  expectedCentavos: 52_000,
  cashPaymentCount: 3,
  close: null,
};
const close = {
  id: "close-1",
  branchId: "branch-centro",
  businessDate: "2026-10-23",
  expectedCentavos: 52_000,
  cashPaymentCount: 3,
  countedCentavos: 51_000,
  differenceCentavos: -1_000,
  note: "Faltó cambio",
  closedAt: "2026-10-23T23:05:00.000Z",
  closedByName: "Camila Rojas",
};

async function openCashClose(routes: Parameters<typeof routeFetcher>[0]) {
  const screen = await openClientSearch(routes);
  await fireEvent.press(screen.getByTestId("cash-close-entry"));
  await waitFor(() => {
    expect(screen.getByText("EFECTIVO ESPERADO")).toBeOnTheScreen();
  });
  return screen;
}

describe("Cerrar caja (S25)", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("shows the expected cash, the live difference, and records the close once", async () => {
    const posted: { body: unknown; key: string | null }[] = [];
    const screen = await openCashClose({
      ...assistantRoutes(),
      [centroToday]: () => jsonResponse(today),
      "POST /api/v1/cash-closes": (init) => {
        posted.push({
          body: JSON.parse(String(init?.body)),
          key: new Headers(init?.headers).get("idempotency-key"),
        });
        return jsonResponse(close, 201);
      },
    });

    expect(screen.getByText("Bs 520")).toBeOnTheScreen();
    expect(screen.getByText("3 ventas en efectivo hoy en Centro")).toBeOnTheScreen();
    expect(screen.getByText("Jueves 23 de octubre · Centro")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Cerrar caja" })).toBeDisabled();

    await fireEvent.changeText(screen.getByLabelText("Efectivo contado"), "520");
    expect(screen.getByText("Diferencia · Bs 0 · Cuadra")).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText("Efectivo contado"), "525,50");
    expect(screen.getByText("Diferencia · +Bs 5,50 · Sobra efectivo")).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText("Efectivo contado"), "510");
    expect(screen.getByText("Diferencia · −Bs 10 · Falta efectivo")).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText("Nota (opcional)"), "Faltó cambio");

    await fireEvent.press(screen.getByRole("button", { name: "Cerrar caja" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Caja cerrada")).toBeOnTheScreen();
    });
    expect(posted).toEqual([
      {
        body: { branchId: "branch-centro", countedCentavos: 51_000, note: "Faltó cambio" },
        key: expect.any(String) as string,
      },
    ]);
    expect(screen.getByText("Bs 510")).toBeOnTheScreen();
    expect(screen.getByText("−Bs 10")).toBeOnTheScreen();
    expect(screen.getByText("Faltó cambio")).toBeOnTheScreen();
    expect(screen.getByText("Cerrada por Camila Rojas a las 19:05.")).toBeOnTheScreen();
  });

  it("opens on the closed state when today is already closed", async () => {
    const screen = await openClientSearch({
      ...assistantRoutes(),
      [centroToday]: () => jsonResponse({ ...today, close }),
    });
    await fireEvent.press(screen.getByTestId("cash-close-entry"));

    await waitFor(() => {
      expect(screen.getByLabelText("Caja cerrada")).toBeOnTheScreen();
    });
    expect(screen.queryByLabelText("Efectivo contado")).toBeNull();
  });

  it("says when someone else closed the day meanwhile and shows that close", async () => {
    let closed = false;
    const screen = await openCashClose({
      ...assistantRoutes(),
      [centroToday]: () => jsonResponse(closed ? { ...today, close } : today),
      "POST /api/v1/cash-closes": () => {
        closed = true;
        return jsonResponse({ code: "cash_close_already_recorded", status: 409 }, 409);
      },
    });

    await fireEvent.changeText(screen.getByLabelText("Efectivo contado"), "520");
    await fireEvent.press(screen.getByRole("button", { name: "Cerrar caja" }));

    await waitFor(() => {
      expect(screen.getByText("La caja de hoy ya se cerró en esta sucursal.")).toBeOnTheScreen();
    });
    await waitFor(() => {
      expect(screen.getByLabelText("Caja cerrada")).toBeOnTheScreen();
    });
  });

  it("keeps the button off for a count it cannot read", async () => {
    const screen = await openCashClose({
      ...assistantRoutes(),
      [centroToday]: () => jsonResponse({ ...today, expectedCentavos: 0, cashPaymentCount: 0 }),
    });

    expect(screen.getByText("Todavía no hay ventas en efectivo hoy.")).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText("Efectivo contado"), "12,345");
    expect(screen.getByRole("button", { name: "Cerrar caja" })).toBeDisabled();
    expect(screen.queryByText(/^Diferencia/)).toBeNull();
  });

  it("lets the Administrator close any Branch from Pagos pendientes", async () => {
    const requested: string[] = [];
    const routes = {
      "/api/v1/staff-members/current": () =>
        jsonResponse({
          id: "staff-5",
          name: "Paola Mendoza",
          email: "paola.mendoza@example.com",
          phone: null,
          role: "administrator",
          branches: [],
        }),
      "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
      "/api/v1/administrator/payments/pending": () => jsonResponse([]),
      "/api/v1/branches": () =>
        jsonResponse([
          { id: "branch-centro", name: "Centro", address: "Calle Ayacucho 245" },
          { id: "branch-urubo", name: "Urubó", address: "Condominio Los Tajibos" },
        ]),
      "/api/v1/cash-closes/today": (init?: RequestInit) => {
        void init;
        return jsonResponse(today);
      },
    };
    const fetcher = routeFetcher(routes);
    const screen = await render(<App runtime={createStaffRuntime(fetcher, "administrator")} />);
    await waitFor(() => {
      expect(screen.getByTestId("cash-close-entry")).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByTestId("cash-close-entry"));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Urubó" })).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: "Urubó" }));

    await waitFor(() => {
      for (const [input] of fetcher.mock.calls as [string][]) {
        if (input.startsWith("/api/v1/cash-closes/today")) requested.push(input);
      }
      expect(requested).toContain("/api/v1/cash-closes/today?branchId=branch-urubo");
    });
  });
});
