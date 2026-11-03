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

// Follow-up 225 §10: «Accesos rápidos» as three Lino tiles, each with a 36 pt
// Rosa tinte disc; without a Plan the booking row is locked at 60 % opacity.
describe("Client Home shortcut tiles", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("draws three Lino tiles with an icon disc each", async () => {
    const screen = await openHome(active);

    expect(screen.getByText("Accesos rápidos")).toHaveStyle({
      color: "#6F6662",
      fontSize: 12,
      textTransform: "uppercase",
    });
    for (const label of ["Reservar una clase", "Evaluación nutricional", "Invita a una amiga"]) {
      expect(screen.getByRole("button", { name: label })).toHaveStyle({
        backgroundColor: "#F5EFE9",
        borderRadius: 16,
      });
      expect(screen.getByText(label)).toHaveStyle({ fontSize: 14 });
    }
    expect(screen.getAllByTestId("shortcut-disc")).toHaveLength(3);
    expect(screen.getAllByTestId("shortcut-disc")[0]).toHaveStyle({
      backgroundColor: "#F2E4E1",
      height: 36,
      width: 36,
    });
    expect(screen.getByTestId("glyph-calendar", hidden)).toHaveProp("stroke", "#B78380");
    expect(screen.getByTestId("glyph-health", hidden)).toHaveProp("width", 18);
    expect(screen.getByTestId("glyph-personAdd", hidden)).toHaveProp("width", 18);
    expect(screen.getByTestId("shortcut-tiles")).toHaveStyle({ flexDirection: "row", gap: 12 });
  });

  it("locks the booking row at 60 % opacity without a Plan", async () => {
    const screen = await openHome({ status: "none", subscription: null });

    const row = screen.getByRole("button", { name: "Reservar una clase" });
    expect(row).toBeDisabled();
    expect(row).toHaveStyle({ backgroundColor: "#F5EFE9", borderRadius: 16, opacity: 0.6 });
    expect(screen.getByText("Necesitas un plan activo")).toHaveStyle({
      color: "#6F6662",
      fontSize: 13,
    });
    expect(screen.getByTestId("shortcut-lock", hidden)).toBeOnTheScreen();
    expect(screen.getByText("Agenda tu cita")).toBeOnTheScreen();
    expect(screen.getByText("Su primera clase es gratis")).toBeOnTheScreen();
  });
});
