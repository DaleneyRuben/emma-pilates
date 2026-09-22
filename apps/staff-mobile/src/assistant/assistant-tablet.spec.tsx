import { cleanup, fireEvent, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";
import { Dimensions } from "react-native";

import { jsonResponse } from "../test-support";
import {
  assistantRoutes,
  invitation,
  newClient,
  openClientSearch,
} from "./assistant-fixtures";

jest.setTimeout(20_000);

const emptyPanel = "Selecciona un cliente para ver sus detalles";
const searchField = "Buscar por nombre, teléfono o correo";

async function selectLucia(routes: Parameters<typeof openClientSearch>[0]) {
  const screen = await openClientSearch(routes);
  expect(screen.getByText(emptyPanel)).toBeOnTheScreen();
  await fireEvent.changeText(screen.getByPlaceholderText(searchField), "luc");
  await waitFor(() => {
    expect(
      screen.getByRole("button", { name: "Ver cliente Lucía Fernández" }),
    ).toBeOnTheScreen();
  });
  await fireEvent.press(
    screen.getByRole("button", { name: "Ver cliente Lucía Fernández" }),
  );
  await waitFor(() => {
    expect(screen.getByLabelText("Lucía Fernández")).toBeOnTheScreen();
  });
  return screen;
}

const cashPayment = {
  payment: {
    id: "payment-cash",
    method: "cash",
    state: "confirmed",
    planId: "plan-8",
    planName: "Paquete de 8 clases",
    planPriceCentavos: 56_000,
    creditAppliedCentavos: 6_000,
    amountDueCentavos: 50_000,
    submittedAt: new Date().toISOString(),
    decidedAt: new Date().toISOString(),
    rejectionReason: null,
    subscriptionId: "subscription-2",
  },
  subscription: {
    id: "subscription-2",
    planName: "Paquete de 8 clases",
    originalClassAllowance: 8,
    remainingClassAllowance: 8,
    startsOn: "2026-09-22",
    endsOn: "2026-10-22",
  },
};

describe("Assistant flows on a tablet", () => {
  beforeEach(() => {
    jest
      .spyOn(Dimensions, "get")
      .mockReturnValue({ width: 1024, height: 1366, scale: 2, fontScale: 1 });
  });

  afterEach(() => {
    cleanup();
    clearMobileQueryCache();
    jest.restoreAllMocks();
  });

  it("shows the Client overview, Bookings, and history beside the search instead of navigating away", async () => {
    const screen = await selectLucia(assistantRoutes());

    expect(screen.getByPlaceholderText(searchField)).toBeOnTheScreen();
    expect(screen.queryByText(emptyPanel)).toBeNull();
    expect(screen.queryByRole("button", { name: "Volver" })).toBeNull();
    expect(
      screen.getByRole("button", { name: "Ver cliente Lucía Fernández" }),
    ).toBeSelected();

    await fireEvent.press(screen.getByRole("button", { name: "Ver reservas" }));
    await waitFor(() => {
      expect(screen.getByLabelText("Reservas de la clienta")).toBeOnTheScreen();
    });
    expect(screen.getByPlaceholderText(searchField)).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Volver" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Ver historial completo" })).toBeOnTheScreen();
    });
    await fireEvent.press(
      screen.getByRole("button", { name: "Ver historial completo" }),
    );
    await waitFor(() => {
      expect(screen.getByLabelText("Historial de clases")).toBeOnTheScreen();
    });
    expect(screen.getByPlaceholderText(searchField)).toBeOnTheScreen();
  });

  it("books a Session in a two-column grid and returns to the split with her Bookings", async () => {
    const screen = await selectLucia({
      ...assistantRoutes(),
      "POST /api/v1/sessions/session-1/bookings": () =>
        jsonResponse({ id: "booking-new" }, 201),
    });

    await fireEvent.press(screen.getByRole("button", { name: "Reservar clase" }));
    await waitFor(() => {
      expect(screen.getByLabelText("Reservar una clase")).toBeOnTheScreen();
    });
    await waitFor(() => {
      expect(screen.getByTestId("assistant-session-grid")).toHaveStyle({
        flexDirection: "row",
        flexWrap: "wrap",
      });
    });
    await fireEvent.press(
      screen.getByRole("button", { name: /^Reformer Pilates \d/ }),
    );
    await waitFor(() => {
      expect(screen.getByText("6 de 12 cupos disponibles")).toBeOnTheScreen();
    });
    expect(screen.getByTestId("assistant-centered-card")).toHaveStyle({
      maxWidth: 640,
    });

    await fireEvent.press(screen.getByRole("button", { name: "Reservar" }));
    await waitFor(() => {
      expect(screen.getByText("Reserva confirmada")).toBeOnTheScreen();
    });
    expect(screen.getByPlaceholderText(searchField)).toBeOnTheScreen();
    expect(screen.queryByLabelText("Reservar una clase")).toBeNull();
  });

  it("takes cash with Plans in a two-column grid and returns to the split overview", async () => {
    const screen = await selectLucia({
      ...assistantRoutes(),
      "POST /api/v1/assistant/clients/client-lucia/cash-payments": () =>
        jsonResponse(cashPayment, 201),
    });

    await fireEvent.press(
      screen.getByRole("button", { name: "Registrar pago en efectivo" }),
    );
    await waitFor(() => {
      expect(screen.getByTestId("assistant-plan-grid")).toHaveStyle({
        flexDirection: "row",
        flexWrap: "wrap",
      });
    });
    await fireEvent.press(
      screen.getByRole("button", { name: "Paquete de 8 clases" }),
    );
    await waitFor(() => {
      expect(screen.getByLabelText("Confirmar pago en efectivo")).toBeOnTheScreen();
    });
    expect(screen.getByTestId("assistant-centered-card")).toHaveStyle({
      maxWidth: 520,
    });
    await fireEvent.press(
      screen.getByRole("button", { name: "Confirmar pago recibido" }),
    );
    await waitFor(() => {
      expect(screen.getByText("¡Pago registrado!")).toBeOnTheScreen();
    });

    await fireEvent.press(screen.getByRole("button", { name: "Volver al cliente" }));
    await waitFor(() => {
      expect(screen.getByLabelText("Lucía Fernández")).toBeOnTheScreen();
    });
    expect(screen.getByPlaceholderText(searchField)).toBeOnTheScreen();
    expect(screen.queryByText("¡Pago registrado!")).toBeNull();
  });

  it("creates a Client from a centered form, shows her beside the search, and clears the panel when the invitation is cancelled", async () => {
    const screen = await openClientSearch({
      ...assistantRoutes(),
      "POST /api/v1/assistant/client-invitations": () =>
        jsonResponse(
          { status: "invited", clientId: "client-new", email: "ana@example.com" },
          201,
        ),
      "/api/v1/assistant/clients/client-new": () =>
        jsonResponse({
          client: newClient,
          subscription: { status: "none", subscription: null },
          nextBooking: null,
          recentHistory: [],
          creditAvailableCentavos: 0,
        }),
      "/api/v1/assistant/client-invitations/client-new": () =>
        jsonResponse(invitation),
      "POST /api/v1/assistant/client-invitations/client-new/cancellation": () =>
        new Response(null, { status: 204 }),
    });

    await fireEvent.press(screen.getByRole("button", { name: "+ Nuevo cliente" }));
    await waitFor(() => {
      expect(screen.getByLabelText("Nuevo cliente")).toBeOnTheScreen();
    });
    expect(screen.getByTestId("assistant-centered-card")).toHaveStyle({
      maxWidth: 560,
    });
    await fireEvent.changeText(screen.getByLabelText("Nombre"), "Ana Nueva");
    await fireEvent.changeText(
      screen.getByLabelText("Correo electrónico"),
      "ana@example.com",
    );
    await fireEvent.press(screen.getByRole("button", { name: "Crear cuenta" }));
    await waitFor(() => {
      expect(screen.getByLabelText("Ana Nueva")).toBeOnTheScreen();
    });
    expect(screen.getByPlaceholderText(searchField)).toBeOnTheScreen();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Cancelar invitación" }),
      ).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: "Cancelar invitación" }));
    await fireEvent.press(
      screen.getByRole("button", { name: "Sí, cancelar invitación" }),
    );
    await waitFor(() => {
      expect(screen.getByText(emptyPanel)).toBeOnTheScreen();
    });
  });
});
