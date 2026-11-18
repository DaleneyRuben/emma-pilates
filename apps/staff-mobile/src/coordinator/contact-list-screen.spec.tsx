import type { ContactAlertItemDto } from "@pilates/api-contracts";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";
import { Linking } from "react-native";

import App from "../../App";
import { assistantRoutes, overview } from "../assistant/assistant-fixtures";
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

const valeria: ContactAlertItemDto = {
  clientId: "client-valeria",
  name: "Valeria Quiroga",
  phone: "+591 70011005",
  photo: null,
  startedOn: "2026-10-02",
  reasons: ["no_booking_7_days"],
};

const daniela: ContactAlertItemDto = {
  clientId: "client-daniela",
  name: "Daniela Rojas",
  phone: null,
  photo: null,
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
  await fireEvent.press(screen.getByTestId("tab-contacts"));
  await waitFor(() => {
    expect(screen.getByRole("header", { name: "Para contactar" })).toBeOnTheScreen();
  });
  return { screen, fetcher };
}

describe("S28 Para contactar", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  // Walkthrough finding 113 (proposal A): one quiet list, no reason chips.
  it("lists clientas as quiet rows, most reasons first, and no money", async () => {
    const { screen } = await openContactList();

    expect(screen.getByText("2 clientas")).toBeOnTheScreen();
    const rows = screen.getAllByTestId(/^contact-row-/);
    expect(rows.map((row) => row.props.testID)).toEqual([
      "contact-row-client-daniela",
      "contact-row-client-valeria",
    ]);

    expect(screen.getByText("Daniela Rojas")).toBeOnTheScreen();
    expect(
      screen.getByText("7 días sin reservar · menos de 2 clases a los 15 días"),
    ).toBeOnTheScreen();
    expect(screen.getByText("Sin teléfono · empezó el 5 de octubre")).toBeOnTheScreen();

    expect(screen.getByText("Valeria Quiroga")).toBeOnTheScreen();
    expect(screen.getByText("Empezó el 2 de octubre")).toBeOnTheScreen();
    expect(screen.queryByText("Menos de 2 clases a los 15 días")).toBeNull();

    expect(
      screen.getAllByRole("button", { name: "Abrir WhatsApp a Valeria Quiroga" }),
    ).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /Abrir WhatsApp a Daniela/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Marcar contactada" })).toBeNull();
    expect(screen.queryByText(/Bs/)).toBeNull();
  });

  it("opens WhatsApp with the Client's number straight from her row", async () => {
    const { screen } = await openContactList();
    await fireEvent.press(screen.getByRole("button", { name: "Abrir WhatsApp a Valeria Quiroga" }));
    expect(Linking.openURL).toHaveBeenCalledWith("https://wa.me/59170011005");
  });

  it("opens her detail sheet with the reasons and «Escribir por WhatsApp»", async () => {
    const { screen } = await openContactList();
    await fireEvent.press(screen.getByTestId("contact-row-client-valeria"));

    await waitFor(() => {
      expect(screen.getByText("Por qué está aquí")).toBeOnTheScreen();
    });
    expect(screen.getByText("🇧🇴 +591 70011005 · empezó el 2 de octubre")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Escribir por WhatsApp" }));
    expect(Linking.openURL).toHaveBeenCalledWith("https://wa.me/59170011005");

    await fireEvent.press(screen.getByRole("button", { name: "Volver" }));
    await waitFor(() => {
      expect(screen.queryByText("Por qué está aquí")).toBeNull();
    });
  });

  it("explains a missing phone and opens her file instead", async () => {
    const { screen } = await openContactList(
      coordinatorRoutes({
        "/api/v1/assistant/clients/client-daniela": () =>
          jsonResponse({
            ...overview,
            client: { ...overview.client, id: "client-daniela", name: "Daniela Rojas" },
          }),
      }),
    );
    await fireEvent.press(screen.getByTestId("contact-row-client-daniela"));

    await waitFor(() => {
      expect(
        screen.getByText(
          "No tiene teléfono registrado, así que no se puede abrir WhatsApp. Háblale en el estudio o revisa su ficha.",
        ),
      ).toBeOnTheScreen();
    });
    expect(screen.queryByRole("button", { name: "Escribir por WhatsApp" })).toBeNull();
    expect(screen.getByText("7 días sin reservar")).toBeOnTheScreen();
    expect(screen.getByText("Menos de 2 clases a los 15 días")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Abrir su ficha" }));
    await waitFor(() => {
      expect(screen.getByRole("header", { name: "Daniela Rojas" })).toBeOnTheScreen();
    });
  });

  it("marks a Client contacted from her sheet and removes her row", async () => {
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

    await fireEvent.press(screen.getByTestId("contact-row-client-valeria"));
    await fireEvent.press(await screen.findByRole("button", { name: "Marcar contactada" }));
    // v2 S28: the brand toast that stays until closed, with her first name.
    await waitFor(() => {
      expect(screen.getByText("Valeria, contactada")).toBeOnTheScreen();
    });
    expect(screen.getByText("Sale de la lista y queda registrado a tu nombre")).toBeOnTheScreen();
    expect(screen.queryByText("Por qué está aquí")).toBeNull();
    await waitFor(() => {
      expect(screen.queryByText("Valeria Quiroga")).toBeNull();
    });
    expect(screen.getByText("1 clienta")).toBeOnTheScreen();
  });

  it("keeps the sheet open and says so when marking fails", async () => {
    const { screen } = await openContactList(
      coordinatorRoutes({
        "POST /api/v1/administrator/contact-alerts/client-valeria/contacted": () =>
          jsonResponse({ message: "boom" }, 500),
      }),
    );

    await fireEvent.press(screen.getByTestId("contact-row-client-valeria"));
    await fireEvent.press(await screen.findByRole("button", { name: "Marcar contactada" }));
    await waitFor(() => {
      expect(
        screen.getByText("No pudimos marcar a Valeria Quiroga. Inténtalo de nuevo."),
      ).toBeOnTheScreen();
    });
    expect(screen.getByText("Por qué está aquí")).toBeOnTheScreen();
  });

  it("shows the empty state", async () => {
    const { screen } = await openContactList(
      coordinatorRoutes({
        "/api/v1/administrator/contact-alerts": () => list([]),
      }),
    );

    expect(screen.getByText("Nadie para contactar")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Buscar una clienta" })).toBeOnTheScreen();
    expect(
      screen.getByText(
        "Aquí aparecen las clientas nuevas que dejan de reservar o toman pocas clases.",
      ),
    ).toBeOnTheScreen();
  });
});
