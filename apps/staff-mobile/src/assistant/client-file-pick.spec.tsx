import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { formatListDate, type ClientContactDto } from "@pilates/api-contracts";
import { brand, clearMobileQueryCache } from "@pilates/mobile-core";
import { Linking } from "react-native";

import App from "../../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";
import { assistantRoutes, lucia, openLucia, overview, today } from "./assistant-fixtures";

jest.setTimeout(20_000);
jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);

const civilIn = (days: number) => {
  const date = new Date(`${today}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const carolina = {
  id: "staff-carolina",
  name: "Carolina Rivas",
  email: "carolina.rivas@example.com",
  phone: null,
  role: "coordinator",
  branches: [],
};

const contacted = {
  onContactList: true,
  lastContactedAt: "2026-11-12T15:00:00.000Z",
  lastContactedByYou: true,
};

async function openAsCoordinator(extra: Parameters<typeof routeFetcher>[0] = {}) {
  const routes = {
    ...assistantRoutes(),
    "/api/v1/staff-members/current": () => jsonResponse(carolina),
    "/api/v1/administrator/contact-alerts": () => jsonResponse({ items: [], totalItems: 0 }),
    "/api/v1/assistant/clients/client-lucia": () =>
      jsonResponse({ ...overview, contact: contacted }),
    ...extra,
  };
  const screen = await render(
    <App runtime={createStaffRuntime(routeFetcher(routes), "coordinator")} />,
  );
  await waitFor(() => expect(screen.getByLabelText("Buscar clienta")).toBeOnTheScreen());
  await fireEvent.changeText(screen.getByPlaceholderText("Nombre, teléfono o correo"), "luc");
  await fireEvent.press(await screen.findByRole("button", { name: "Ver clienta Lucía Fernández" }));
  await waitFor(() => expect(screen.getByLabelText(lucia.name)).toBeOnTheScreen());
  return screen;
}

// Staff pick E4 A (E-C08, E-C09): the plan as the 600 hero, the Freeze on its own
// row, and the actions on top according to the role.
describe("Ficha de la clienta, pick E4 A", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
    jest.mocked(Linking.openURL).mockClear();
  });

  it("puts the plan in the 600 hero", async () => {
    const screen = await openLucia(assistantRoutes());

    const block = screen.getByTestId("client-plan-card");
    expect(block).toHaveStyle({ backgroundColor: brand.rosaProfundo });
    const inside = within(block);
    expect(inside.getByText("Paquete de 8 clases")).toBeOnTheScreen();
    expect(inside.getByText("Activa")).toBeOnTheScreen();
    expect(inside.getByText("5")).toBeOnTheScreen();
    expect(inside.getByText("clases disponibles")).toBeOnTheScreen();
    expect(inside.getByText("5 de 8 del plan · vence el lun 12 oct")).toBeOnTheScreen();
  });

  it("gives the Assistant «Reservar clase» and «Registrar pago» on top, then her records", async () => {
    const screen = await openLucia(assistantRoutes());

    const actions = within(screen.getByTestId("client-overview-actions"));
    expect(actions.getByRole("button", { name: "Reservar clase" })).toBeEnabled();
    expect(actions.getByRole("button", { name: "Registrar pago" })).toBeEnabled();
    const rows = within(screen.getByTestId("client-overview-rows"));
    expect(rows.getByRole("button", { name: /^Reservas, / })).toBeOnTheScreen();
    expect(rows.getByRole("button", { name: "Historial de clases" })).toBeOnTheScreen();
    expect(rows.queryByRole("button", { name: "Registrar pago" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Escribir por WhatsApp" })).toBeNull();
    expect(screen.queryByText("Último contacto")).toBeNull();
  });

  it("shows the Freeze on its own white card", async () => {
    const startsOn = civilIn(2);
    const endsOn = civilIn(4);
    const screen = await openLucia({
      ...assistantRoutes(),
      "/api/v1/assistant/clients/client-lucia": () =>
        jsonResponse({
          ...overview,
          subscription: {
            ...overview.subscription,
            freeze: { id: "freeze-1", state: "approved", startsOn, endsOn },
          },
        }),
    });

    const row = screen.getByTestId("client-freeze-row");
    expect(row).toHaveStyle({ backgroundColor: brand.white, borderRadius: 20 });
    expect(
      within(row).getByText(
        `Congelado del ${formatListDate(startsOn)} al ${formatListDate(endsOn)}`,
      ),
    ).toBeOnTheScreen();
    expect(within(row).getByText("Aprobado · no puede reservar esos días")).toBeOnTheScreen();
  });

  it("gives the Coordinator WhatsApp, Llamar and her last contact, and still lets her book", async () => {
    const screen = await openAsCoordinator();

    const actions = within(screen.getByTestId("client-overview-actions"));
    await fireEvent.press(actions.getByRole("button", { name: "Escribir por WhatsApp" }));
    expect(Linking.openURL).toHaveBeenCalledWith("https://wa.me/59170011001");
    await fireEvent.press(actions.getByRole("button", { name: "Llamar" }));
    expect(Linking.openURL).toHaveBeenCalledWith("tel:+59170011001");
    expect(screen.queryByRole("button", { name: "Registrar pago" })).toBeNull();
    expect(screen.getByRole("button", { name: "Reservar clase" })).toBeOnTheScreen();

    const card = within(screen.getByTestId("client-last-contact"));
    expect(card.getByText("Último contacto")).toBeOnTheScreen();
    expect(
      card.getByText("La contactaste el jue 12 nov. Está en Para contactar."),
    ).toBeOnTheScreen();
    expect(screen.getByTestId("client-overview-bookings")).toBeOnTheScreen();
  });

  it("notes a contact from the ficha while she is on Para contactar", async () => {
    let contact: ClientContactDto = {
      onContactList: true,
      lastContactedAt: null,
      lastContactedByYou: false,
    };
    const marked = jest.fn();
    const screen = await openAsCoordinator({
      "/api/v1/assistant/clients/client-lucia": () => jsonResponse({ ...overview, contact }),
      "POST /api/v1/administrator/contact-alerts/client-lucia/contacted": () => {
        marked();
        contact = {
          onContactList: false,
          lastContactedAt: contacted.lastContactedAt,
          lastContactedByYou: true,
        };
        return new Response(null, { status: 204 });
      },
    });

    expect(
      screen.getByText("Todavía no hay contactos anotados. Está en Para contactar."),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Anotar contacto" }));

    await waitFor(() =>
      expect(screen.getByText("La contactaste el jue 12 nov.")).toBeOnTheScreen(),
    );
    expect(marked).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Anotar contacto" })).toBeNull();
  });

  it("says why WhatsApp and Llamar are missing when her phone is incomplete", async () => {
    const screen = await openAsCoordinator({
      "/api/v1/assistant/clients/client-lucia": () =>
        jsonResponse({
          ...overview,
          client: { ...lucia, phone: "7001" },
          contact: contacted,
        }),
    });

    expect(screen.queryByRole("button", { name: "Escribir por WhatsApp" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Llamar" })).toBeNull();
    expect(
      screen.getByText(
        "Su celular está incompleto (7001), así que no se puede escribirle ni llamarla. Háblale en el estudio.",
      ),
    ).toBeOnTheScreen();
  });
});
