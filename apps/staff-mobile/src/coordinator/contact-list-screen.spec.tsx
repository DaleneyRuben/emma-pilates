import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";
import { Linking } from "react-native";

import App from "../../App";
import { assistantRoutes } from "../assistant/assistant-fixtures";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(20_000);

jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);

const carolina = {
  id: "staff-carolina",
  name: "Carolina Rivas",
  email: "carolina.rivas@example.com",
  phone: null,
  role: "coordinator",
  branches: [],
};

const valeria = {
  clientId: "client-valeria",
  name: "Valeria Quiroga",
  phone: "+591 70011005",
  startedOn: "2026-10-02",
  reasons: ["no_booking_7_days"],
};

const daniela = {
  clientId: "client-daniela",
  name: "Daniela Rojas",
  phone: null,
  startedOn: "2026-10-05",
  reasons: ["fewer_than_2_classes_by_day_15", "no_booking_7_days"],
};

const list = (items: (typeof valeria)[]) => jsonResponse({ items, totalItems: items.length });

const coordinatorRoutes = (extra: Parameters<typeof routeFetcher>[0] = {}) => ({
  ...assistantRoutes(),
  "/api/v1/staff-members/current": () => jsonResponse(carolina),
  "/api/v1/administrator/contact-alerts": () => list([valeria, daniela]),
  ...extra,
});

async function openContactList(routes = coordinatorRoutes()) {
  const fetcher = routeFetcher(routes);
  const screen = await render(<App runtime={createStaffRuntime(fetcher, "coordinator")} />);
  await waitFor(() => {
    expect(screen.getByLabelText("Buscar cliente")).toBeOnTheScreen();
  });
  await fireEvent.press(screen.getByRole("button", { name: "Para contactar" }));
  await waitFor(() => {
    expect(screen.getByLabelText("Volver")).toBeOnTheScreen();
  });
  return { screen, fetcher };
}

describe("S28 Para contactar", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("lists clientas with reasons, WhatsApp, and no money", async () => {
    const { screen } = await openContactList();

    expect(screen.getByText("Valeria Quiroga")).toBeOnTheScreen();
    expect(screen.getByText("+591 70011005")).toBeOnTheScreen();
    expect(screen.getAllByText("7 días sin reservar").length).toBeGreaterThan(0);
    expect(screen.getByText("Empezó el 2 de octubre")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Abrir WhatsApp" })).toBeOnTheScreen();

    expect(screen.getByText("Daniela Rojas")).toBeOnTheScreen();
    expect(screen.getByText("Sin teléfono")).toBeOnTheScreen();
    expect(screen.getByText("Menos de 2 clases a los 15 días")).toBeOnTheScreen();
    expect(screen.getAllByRole("button", { name: "Abrir WhatsApp" })).toHaveLength(1);
    expect(screen.queryByText(/Bs/)).toBeNull();
  });

  it("opens WhatsApp with the Client's number", async () => {
    const { screen } = await openContactList();
    await fireEvent.press(screen.getByRole("button", { name: "Abrir WhatsApp" }));
    expect(Linking.openURL).toHaveBeenCalledWith("https://wa.me/59170011005");
  });

  it("marks a Client contacted and removes her card", async () => {
    let items = [valeria, daniela];
    const { screen } = await openContactList(
      coordinatorRoutes({
        "/api/v1/administrator/contact-alerts": () => list(items),
        "POST /api/v1/administrator/contact-alerts/client-valeria/contacted": () => {
          items = [daniela];
          return new Response(null, { status: 204 });
        },
      }),
    );

    await fireEvent.press(screen.getAllByRole("button", { name: "Contactada" })[0]!);
    await waitFor(() => {
      expect(screen.getByText("Marcaste a Valeria Quiroga como contactada.")).toBeOnTheScreen();
    });
    await waitFor(() => {
      expect(screen.queryByText("Valeria Quiroga")).toBeNull();
    });
  });

  it("shows the empty state", async () => {
    const { screen } = await openContactList(
      coordinatorRoutes({
        "/api/v1/administrator/contact-alerts": () => list([]),
      }),
    );

    expect(screen.getByText("Nadie para contactar por ahora.")).toBeOnTheScreen();
    expect(
      screen.getByText(
        "Aquí aparecen las clientas nuevas que dejan de reservar o toman pocas clases.",
      ),
    ).toBeOnTheScreen();
  });
});
