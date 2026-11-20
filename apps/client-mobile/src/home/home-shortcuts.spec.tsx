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

// Rosa Emma C02s, C02b: «Accesos rápidos» as a Lora 24 section of white
// tiles with the icon on a 50 disc; without a Plan the booking row is a
// locked soft inset. FIX-082: with a Plan, «Reservar una clase» left the
// tiles for the solid button.
describe("Client Home shortcut tiles", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("draws two white tiles with the icon on a 50 disc", async () => {
    const screen = await openHome(active);

    expect(screen.getByText("Accesos rápidos")).toHaveStyle({
      color: "#93615D",
      fontFamily: "Lora_400Regular",
      fontSize: 24,
    });
    for (const label of ["Evaluación nutricional", "Invita a una amiga"]) {
      expect(screen.getByRole("button", { name: label })).toHaveStyle({
        backgroundColor: "#FFFBFB",
        borderRadius: 20,
      });
      expect(screen.getByText(label)).toHaveStyle({ fontSize: 15, fontWeight: "700" });
    }
    expect(screen.getAllByTestId("shortcut-disc")[0]).toHaveStyle({
      backgroundColor: "#FEF6F2",
      width: 40,
    });
    expect(screen.getByTestId("glyph-health", hidden)).toHaveProp("stroke", "#93615D");
    expect(screen.getByTestId("glyph-health", hidden)).toHaveProp("width", 20);
    expect(screen.getByTestId("glyph-personAdd", hidden)).toHaveProp("width", 20);
    expect(screen.getByTestId("shortcut-tiles")).toHaveStyle({ flexDirection: "row", gap: 12 });
  });

  it("locks the booking row as a soft inset without a Plan", async () => {
    const screen = await openHome({ status: "none", subscription: null });

    const row = screen.getByRole("button", { name: "Reservar una clase" });
    expect(row).toBeDisabled();
    expect(row).toHaveStyle({
      backgroundColor: "#FEF6F2",
      borderColor: "#E7CCBF",
      borderRadius: 16,
    });
    expect(screen.getByText("Necesitas un plan activo")).toHaveStyle({
      color: "#93615D",
      fontSize: 13,
    });
    expect(screen.getByTestId("shortcut-lock", hidden)).toBeOnTheScreen();
    expect(screen.getByText("Agenda tu cita")).toBeOnTheScreen();
    expect(screen.getByText("Su primera clase es gratis")).toBeOnTheScreen();
  });
});
