import { cleanup, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(20_000);

const hidden = { includeHiddenElements: true };

const profile = {
  id: "client-1",
  name: "Lucía Fernández",
  email: "lucia@example.com",
  phone: null,
  referralCode: "REF-LUCIA",
};

const active = {
  status: "active",
  subscription: {
    id: "subscription-1",
    planName: "Paquete de 8 clases",
    originalClassAllowance: 8,
    remainingClassAllowance: 5,
    startsOn: "2026-09-11",
    endsOn: "2026-10-11",
  },
};

async function openHome(subscription: unknown) {
  const screen = await render(
    <App
      runtime={createClientRuntime(
        routeFetcher({
          "/api/v1/clients/current": () => jsonResponse(profile),
          "/api/v1/clients/current/subscription": () => jsonResponse(subscription),
        }),
      )}
    />,
  );
  await waitFor(() => {
    expect(screen.getByText("Hola, Lucía")).toBeOnTheScreen();
  });
  return screen;
}

// MOB-042: 02's shortcuts are a full-width «Reservar una clase» row with an
// icon tile over two half-width tiles, as the frame draws them.
describe("Client Home shortcut tiles", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("draws the full-width row with its tile and the two half-width tiles", async () => {
    const screen = await openHome(active);

    expect(screen.getByText("Accesos rápidos")).toHaveStyle({
      color: "#766D69",
      fontSize: 11,
      letterSpacing: 1.76,
      textTransform: "uppercase",
    });
    const title = screen.getByText("Reservar una clase");
    expect(title).toHaveStyle({ color: "#4A4A4A", fontFamily: "Lora_500Medium", fontSize: 17 });
    expect(screen.getByText("Horarios de esta semana")).toHaveStyle({
      color: "#766D69",
      fontSize: 13,
    });
    const tile = screen.getByTestId("shortcut-tile");
    expect(tile).toHaveStyle({
      backgroundColor: "rgba(216,189,184,0.28)",
      borderRadius: 12,
      height: 44,
      width: 44,
    });
    const calendar = screen.getByTestId("glyph-calendar", hidden);
    expect(calendar).toHaveProp("width", 22);
    expect(calendar).toHaveProp("stroke", "#B78380");
    expect(screen.getByRole("button", { name: /^Reservar una clase/ })).toHaveStyle({
      alignItems: "center",
      flexDirection: "row",
      gap: 14,
      padding: 18,
    });

    expect(screen.getByText("Evaluación nutricional")).toHaveStyle({
      fontFamily: "Lora_500Medium",
      fontSize: 16,
    });
    expect(screen.getByText("Mis referidos")).toHaveStyle({
      fontFamily: "Lora_500Medium",
      fontSize: 16,
    });
    expect(screen.getByText("Agenda tu cita del mes")).toHaveStyle({
      color: "#766D69",
      fontSize: 12,
    });
    expect(screen.getByTestId("glyph-trend", hidden)).toHaveProp("width", 22);
    expect(screen.getByTestId("glyph-person", hidden)).toHaveProp("width", 22);
    expect(screen.getByTestId("shortcut-tiles")).toHaveStyle({ flexDirection: "row", gap: 12 });
    expect(screen.getByRole("button", { name: /^Mis referidos/ })).toHaveStyle({
      flex: 1,
      gap: 10,
      padding: 18,
    });
  });

  it("mutes the disabled row on Arena with the quiet lock", async () => {
    const screen = await openHome({ status: "none", subscription: null });

    const row = screen.getByRole("button", { name: "Reservar una clase" });
    expect(row).toHaveStyle({
      backgroundColor: "#F2ECE5",
      borderColor: "#E7DCD8",
      borderRadius: 16,
      borderWidth: 1,
    });
    expect(screen.getByText("Reservar una clase")).toHaveStyle({ color: "#B3A9A5" });
    expect(screen.getByTestId("shortcut-tile")).toHaveStyle({
      backgroundColor: "rgba(74,74,74,0.05)",
    });
    expect(screen.getByTestId("glyph-calendar", hidden)).toHaveProp("stroke", "#B3A9A5");
    expect(screen.getByText("Necesitas un plan activo para reservar")).toHaveStyle({
      color: "#766D69",
      fontSize: 13,
    });
    const lock = screen.getByTestId("shortcut-lock", hidden);
    expect(lock).toHaveProp("stroke", "#C4BAB6");
    expect(lock).toHaveProp("width", 19);
    expect(screen.queryByText("Horarios de esta semana")).toBeNull();
  });
});
