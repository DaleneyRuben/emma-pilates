import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { assistantRoutes, lucia, newClient, overview } from "../assistant/assistant-fixtures";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(20_000);

// IDN-009 / ADR-0102 (follow-up 158): the Coordinator's own stack searches
// Clients and manages their Bookings like the Assistant, never sells or
// registers a Client, and cancels a class like the Administrator.
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
  await fireEvent.changeText(
    screen.getByPlaceholderText("Buscar por nombre, teléfono o correo"),
    query,
  );
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

  it("lands on Buscar cliente without «Nuevo cliente» and with «Cancelar una clase»", async () => {
    const { screen } = await openAsCoordinator();

    expect(screen.queryByRole("button", { name: "+ Nuevo cliente" })).toBeNull();
    expect(screen.getByRole("button", { name: "Para contactar" })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Cancelar una clase" }));
    await waitFor(() => {
      expect(screen.getByText("Cancelar una clase")).toBeOnTheScreen();
    });
  });

  it("books for a Client but never sells her a Plan", async () => {
    const { screen, fetcher } = await openAsCoordinator();
    await openClient(screen, "luc", lucia.name);

    expect(screen.getByRole("button", { name: "Reservar clase" })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Registrar pago en efectivo" })).toBeNull();
    expect(screen.getByRole("button", { name: "Ver reservas" })).toBeOnTheScreen();
    const reads = fetcher.mock.calls.map(([input]) => String(input));
    expect(reads.some((path) => path.includes("plan-quotes"))).toBe(false);
  });

  it("tells her a Client without a Plan needs one, with no invitation actions", async () => {
    const { screen, fetcher } = await openAsCoordinator();
    await openClient(screen, "ana", newClient.name);

    expect(screen.getByText("La clienta necesita un plan activo para reservar.")).toBeOnTheScreen();
    expect(screen.queryByText(/Registra un pago/)).toBeNull();
    const reads = fetcher.mock.calls.map(([input]) => String(input));
    expect(reads.some((path) => path.includes("client-invitations"))).toBe(false);
  });

  it("names her Role «Coordinación» and every Branch on Perfil", async () => {
    const { screen } = await openAsCoordinator();

    await fireEvent.press(screen.getByRole("button", { name: "Tu cuenta" }));
    await waitFor(() => {
      expect(screen.getByText("Coordinación")).toBeOnTheScreen();
    });
    expect(screen.getByText("Todas las sucursales")).toBeOnTheScreen();
  });
});
