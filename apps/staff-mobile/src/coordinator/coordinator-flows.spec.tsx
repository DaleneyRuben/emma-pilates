import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import {
  assistantRoutes,
  invitation,
  lucia,
  newClient,
  overview,
} from "../assistant/assistant-fixtures";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(20_000);

// IDN-009 / ADR-0102 (follow-up 158): the Coordinator's own stack searches
// Clients and manages their Bookings like the Assistant, never sells, and
// cancels a class like the Administrator. FIX-040 (2026-11-05): she registers
// new Clients with the Assistant's form and follows up their invitation.
const carolina = {
  id: "staff-carolina",
  name: "Carolina Rivas",
  email: "carolina.rivas@example.com",
  phone: null,
  role: "coordinator",
  branches: [],
};

const coordinatorRoutes = (extra: Parameters<typeof routeFetcher>[0] = {}) => ({
  ...assistantRoutes(),
  "/api/v1/staff-members/current": () => jsonResponse(carolina),
  "/api/v1/assistant/clients?query=ana": () => jsonResponse([newClient]),
  "/api/v1/assistant/clients/client-new": () =>
    jsonResponse({
      ...overview,
      client: newClient,
      subscription: { status: "none", subscription: null },
      nextBooking: null,
      recentHistory: [],
      creditAvailableCentavos: 0,
    }),
  "/api/v1/assistant/client-invitations/client-new": () => jsonResponse(invitation),
  "/api/v1/assistant/clients?query=zzz": () => jsonResponse([]),
  "/api/v1/administrator/sessions": () => jsonResponse([]),
  "/api/v1/administrator/contact-alerts": () => jsonResponse({ items: [], totalItems: 0 }),
  ...extra,
});

async function openAsCoordinator(routes = coordinatorRoutes()) {
  const fetcher = routeFetcher(routes);
  const screen = await render(<App runtime={createStaffRuntime(fetcher, "coordinator")} />);
  await waitFor(() => {
    expect(screen.getByLabelText("Buscar cliente")).toBeOnTheScreen();
  });
  return { screen, fetcher };
}

async function openClient(
  screen: Awaited<ReturnType<typeof openAsCoordinator>>["screen"],
  query: string,
  name: string,
) {
  await fireEvent.changeText(screen.getByPlaceholderText("Nombre, teléfono o correo"), query);
  await waitFor(() => {
    expect(screen.getByRole("button", { name: `Ver cliente ${name}` })).toBeOnTheScreen();
  });
  await fireEvent.press(screen.getByRole("button", { name: `Ver cliente ${name}` }));
  await waitFor(() => {
    expect(screen.getByLabelText(name)).toBeOnTheScreen();
  });
}

describe("the Coordinator's Staff app", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  // v2: Para contactar and Horario (with «Cancelar una clase») are her tabs now.
  it("lands on Buscar cliente with «Nuevo cliente», beside her own tabs", async () => {
    const { screen } = await openAsCoordinator();

    expect(screen.getByTestId("client-search-new-client")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Cancelar una clase" })).toBeNull();
    expect(screen.getByTestId("tab-contacts")).toBeOnTheScreen();
    expect(screen.getByTestId("tab-schedule")).toBeOnTheScreen();
  });

  it("books for a Client but never sells her a Plan", async () => {
    const { screen, fetcher } = await openAsCoordinator();
    await openClient(screen, "luc", lucia.name);

    expect(screen.getByRole("button", { name: "Reservar clase" })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Registrar pago en efectivo" })).toBeNull();
    expect(screen.getByTestId("client-overview-bookings")).toBeOnTheScreen();
    const reads = fetcher.mock.calls.map(([input]) => String(input));
    expect(reads.some((path) => path.includes("plan-quotes"))).toBe(false);
  });

  it("offers «Nuevo cliente» when the search finds no one", async () => {
    const { screen } = await openAsCoordinator();

    await fireEvent.changeText(screen.getByPlaceholderText("Nombre, teléfono o correo"), "zzz");
    await waitFor(() => {
      expect(screen.getByText("No encontramos a nadie")).toBeOnTheScreen();
    });
    expect(screen.getByTestId("client-search-empty-new-client")).toBeOnTheScreen();
  });

  it("registers a new Client with the Assistant's form and follows up her invitation, without selling", async () => {
    const invited = jest.fn();
    const { screen } = await openAsCoordinator(
      coordinatorRoutes({
        "POST /api/v1/assistant/client-invitations": (init) => {
          invited(JSON.parse(String(init?.body)));
          return jsonResponse(
            { status: "invited", clientId: "client-new", email: "ana@example.com" },
            201,
          );
        },
      }),
    );

    await fireEvent.press(screen.getByTestId("client-search-new-client"));
    await waitFor(() => {
      expect(screen.getByLabelText("Nuevo cliente")).toBeOnTheScreen();
    });
    await fireEvent.changeText(screen.getByLabelText("Nombre"), "Ana Nueva");
    await fireEvent.changeText(screen.getByLabelText("Correo electrónico"), "ana@example.com");
    await fireEvent.press(screen.getByRole("radio", { name: "Instagram" }));
    await fireEvent.press(screen.getByRole("button", { name: "Crear cuenta" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Ana Nueva")).toBeOnTheScreen();
    });
    expect(invited).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Ana Nueva", email: "ana@example.com" }),
    );
    await waitFor(() => {
      expect(screen.getByText("Cuenta pendiente de activación")).toBeOnTheScreen();
    });
    expect(screen.getByRole("button", { name: "Reenviar enlace" })).toBeOnTheScreen();
    expect(screen.getByText("La clienta necesita un plan activo para reservar.")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Registrar pago en efectivo" })).toBeNull();
    expect(screen.queryByText(/Puede comprar su plan/)).toBeNull();
  });

  it("names her Role «Coordinación» and every Branch on Perfil", async () => {
    const { screen } = await openAsCoordinator();

    await fireEvent.press(screen.getByTestId("tab-profile"));
    await waitFor(() => {
      expect(screen.getByText("Coordinación")).toBeOnTheScreen();
    });
    expect(screen.getByText("Todas las sucursales")).toBeOnTheScreen();
  });
});
