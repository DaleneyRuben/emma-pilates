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
  await fireEvent.press(screen.getByTestId("tab-cash"));
  await waitFor(() => {
    expect(screen.getByText("¿Cuánto efectivo hay en la caja?")).toBeOnTheScreen();
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

    // FIX-083 (Cerrar caja pick A): count first, the expected cash quietly below.
    expect(screen.getByLabelText("¿Cuánto efectivo hay en la caja?")).toHaveStyle({ fontSize: 30 });
    expect(
      screen.getByText("Cuenta los billetes antes de mirar el total esperado."),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText("Esperado según los pagos, Bs 520")).toBeOnTheScreen();
    expect(screen.getByText("3 ventas en efectivo hoy en Centro")).toBeOnTheScreen();
    expect(screen.getByText("Viernes 23 de octubre · Centro")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Volver" })).toBeNull();
    expect(
      screen.getByText("Te pediremos confirmar: un cierre no se puede deshacer."),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Cerrar caja" })).toBeDisabled();
    expect(screen.queryByLabelText("Nota (opcional)")).toBeNull();

    await fireEvent.changeText(screen.getByLabelText("¿Cuánto efectivo hay en la caja?"), "520");
    expect(screen.getByLabelText("Diferencia · Bs 0 · Cuadra")).toBeOnTheScreen();
    expect(screen.getByText("Cuadra")).toHaveStyle({ color: "#93615D" });
    expect(screen.queryByLabelText("Nota (opcional)")).toBeNull();
    await fireEvent.changeText(screen.getByLabelText("¿Cuánto efectivo hay en la caja?"), "525,50");
    expect(screen.getByLabelText("Diferencia · +Bs 5,50 · Sobra efectivo")).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText("¿Cuánto efectivo hay en la caja?"), "510");
    expect(screen.getByLabelText("Diferencia · −Bs 10 · Falta efectivo")).toBeOnTheScreen();
    expect(screen.getByText("Falta Bs 10")).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText("Nota (opcional)"), "Faltó cambio");

    await fireEvent.press(screen.getByRole("button", { name: "Cerrar caja" }));
    await waitFor(() => expect(screen.getByText("¿Cerrar la caja de hoy?")).toBeOnTheScreen());
    expect(posted).toEqual([]);
    await fireEvent.press(screen.getByTestId("cash-close-confirm"));

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
    expect(screen.getByText("La cerró Camila Rojas a las 19:05.")).toBeOnTheScreen();
  });

  it("names the voided cash sales still in the drawer on their own line (FIX-004)", async () => {
    const screen = await openCashClose({
      ...assistantRoutes(),
      [centroToday]: () => jsonResponse({ ...today, voidedCashCentavos: 29_000 }),
    });

    expect(screen.getByLabelText("Esperado según los pagos, Bs 520")).toBeOnTheScreen();
    expect(screen.getByLabelText("Ventas anuladas (efectivo en caja), Bs 290")).toBeOnTheScreen();
  });

  it("shows no voided line when nothing was voided", async () => {
    const screen = await openCashClose({
      ...assistantRoutes(),
      [centroToday]: () => jsonResponse({ ...today, voidedCashCentavos: 0 }),
    });

    expect(screen.queryByText(/Ventas anuladas/)).toBeNull();
  });

  it("opens on the closed state when today is already closed", async () => {
    const screen = await openClientSearch({
      ...assistantRoutes(),
      [centroToday]: () => jsonResponse({ ...today, close }),
    });
    await fireEvent.press(screen.getByTestId("tab-cash"));

    await waitFor(() => {
      expect(screen.getByLabelText("Caja cerrada")).toBeOnTheScreen();
    });
    expect(screen.queryByLabelText("¿Cuánto efectivo hay en la caja?")).toBeNull();
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

    await fireEvent.changeText(screen.getByLabelText("¿Cuánto efectivo hay en la caja?"), "520");
    await fireEvent.press(screen.getByRole("button", { name: "Cerrar caja" }));
    await fireEvent.press(await screen.findByTestId("cash-close-confirm"));

    await waitFor(() => {
      expect(screen.getByText("La caja de hoy ya se cerró en esta sucursal.")).toBeOnTheScreen();
    });
    await waitFor(() => {
      expect(screen.getByLabelText("Caja cerrada")).toBeOnTheScreen();
    });
  });

  it("closes the sheet and says so when the close fails", async () => {
    const screen = await openCashClose({
      ...assistantRoutes(),
      [centroToday]: () => jsonResponse(today),
      "POST /api/v1/cash-closes": () => jsonResponse({ code: "boom", status: 500 }, 500),
    });

    await fireEvent.changeText(screen.getByLabelText("¿Cuánto efectivo hay en la caja?"), "520");
    await fireEvent.press(screen.getByRole("button", { name: "Cerrar caja" }));
    await fireEvent.press(await screen.findByTestId("cash-close-confirm"));

    await waitFor(() =>
      expect(
        screen.getByLabelText("No pudimos cerrar la caja. Inténtalo de nuevo."),
      ).toBeOnTheScreen(),
    );
    expect(screen.queryByTestId("cash-close-confirm")).toBeNull();
    expect(screen.queryByLabelText("Caja cerrada")).toBeNull();
  });

  it("keeps the button off for a count it cannot read", async () => {
    const screen = await openCashClose({
      ...assistantRoutes(),
      [centroToday]: () => jsonResponse(today),
    });

    await fireEvent.changeText(screen.getByLabelText("¿Cuánto efectivo hay en la caja?"), "12,345");
    expect(screen.getByRole("button", { name: "Cerrar caja" })).toBeDisabled();
    expect(screen.queryByLabelText(/^Diferencia ·/)).toBeNull();
  });

  // FIX-083 (Cerrar caja pick C): a day without cash closes in zero, calmly.
  it("offers to close in zero on a day without cash payments", async () => {
    const posted: unknown[] = [];
    const screen = await openClientSearch({
      ...assistantRoutes(),
      [centroToday]: () => jsonResponse({ ...today, expectedCentavos: 0, cashPaymentCount: 0 }),
      "POST /api/v1/cash-closes": (init) => {
        posted.push(JSON.parse(String(init?.body)));
        return jsonResponse({ ...close, expectedCentavos: 0, countedCentavos: 0 }, 201);
      },
    });
    await fireEvent.press(screen.getByTestId("tab-cash"));

    await waitFor(() => {
      expect(screen.getByText("Hoy no hubo pagos en efectivo")).toBeOnTheScreen();
    });
    expect(screen.queryByLabelText("¿Cuánto efectivo hay en la caja?")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Cerrar caja sin efectivo" }));
    await fireEvent.press(await screen.findByTestId("cash-close-confirm"));

    await waitFor(() => expect(screen.getByLabelText("Caja cerrada")).toBeOnTheScreen());
    expect(posted).toEqual([{ branchId: "branch-centro", countedCentavos: 0, note: null }]);
  });

  it("still lets her count cash on a day without cash payments", async () => {
    const screen = await openClientSearch({
      ...assistantRoutes(),
      [centroToday]: () => jsonResponse({ ...today, expectedCentavos: 0, cashPaymentCount: 0 }),
    });
    await fireEvent.press(screen.getByTestId("tab-cash"));
    await fireEvent.press(
      await screen.findByRole("button", { name: "Sí hay efectivo en la caja" }),
    );

    await waitFor(() =>
      expect(screen.getByLabelText("¿Cuánto efectivo hay en la caja?")).toBeOnTheScreen(),
    );
    await fireEvent.changeText(screen.getByLabelText("¿Cuánto efectivo hay en la caja?"), "50");
    expect(screen.getByLabelText("Diferencia · +Bs 50 · Sobra efectivo")).toBeOnTheScreen();
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

  it("keeps the cash close usable when a profile refetch fails over cached data", async () => {
    let profileDown = false;
    const routes = assistantRoutes();
    const profile = routes["/api/v1/staff-members/current"];
    const screen = await openCashClose({
      ...routes,
      "/api/v1/staff-members/current": () => {
        if (profileDown) throw new TypeError("Network request failed");
        return profile();
      },
      [centroToday]: () => jsonResponse(today),
    });

    await fireEvent.press(screen.getByTestId("tab-clients"));
    profileDown = true;
    await fireEvent.press(await screen.findByTestId("tab-cash"));

    expect(await screen.findByText("¿Cuánto efectivo hay en la caja?")).toBeOnTheScreen();
    expect(screen.queryByText("No pudimos cargar la caja de hoy.")).toBeNull();
  });

  it("shows the query failure when the Branch list cannot load, not an endless spinner", async () => {
    const screen = await render(
      <App
        runtime={createStaffRuntime(
          routeFetcher({
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
            "/api/v1/branches": () => {
              throw new TypeError("Network request failed");
            },
          }),
          "administrator",
        )}
      />,
    );
    await waitFor(() => {
      expect(screen.getByTestId("cash-close-entry")).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByTestId("cash-close-entry"));

    await waitFor(() => {
      expect(screen.getByText("No pudimos cargar la caja de hoy.")).toBeOnTheScreen();
    });
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeOnTheScreen();
    expect(screen.queryByText("Cargando la caja de hoy")).toBeNull();
  });
});
