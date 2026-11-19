import { cleanup, fireEvent, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { jsonResponse } from "../test-support";
import {
  assistantRoutes,
  from,
  openClientSearch,
  openLucia,
  session,
  until,
} from "./assistant-fixtures";

jest.setTimeout(20_000);

const hidden = { includeHiddenElements: true };

// MOB-042: S04's result is an avatar, the name over the contact, and the
// chevron; S07 draws the picker pill and the shared Session card.
describe("Assistant rows", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("draws the search result as a v2 person row in a Lino group", async () => {
    const screen = await openClientSearch(assistantRoutes());

    await fireEvent.changeText(screen.getByPlaceholderText("Nombre, teléfono o correo"), "luc");
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Ver clienta Lucía Fernández" })).toBeOnTheScreen();
    });

    const row = screen.getByRole("button", { name: "Ver clienta Lucía Fernández" });
    expect(row).toHaveStyle({ alignItems: "center", flexDirection: "row", minHeight: 64 });
    // FIX-089 (ListaC): bold Crema initials on a Palo de rosa circle.
    expect(screen.getByText("LF")).toHaveStyle({
      color: "#F9F4F2",
      fontFamily: "WorkSans_600SemiBold",
    });
    expect(screen.getByText("Lucía Fernández")).toHaveStyle({ color: "#93615D", fontSize: 16 });
    expect(screen.getByText("🇧🇴 +591 70011001 · lucia@example.com")).toHaveStyle({
      color: "#93615D",
      fontSize: 13,
    });
    expect(screen.getByTestId("chevron", hidden)).toHaveProp("stroke", "#93615D");
  });

  it("draws the picker pill and the Session card on the booking screen", async () => {
    const screen = await openLucia(assistantRoutes());

    await fireEvent.press(screen.getByRole("button", { name: "Reservar clase" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Sucursal: Centro" })).toBeOnTheScreen();
    });
    expect(screen.getByText(/^Reservando para Lucía Fernández/)).toBeOnTheScreen();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Reformer Pilates \d/ })).toBeOnTheScreen();
    });
    // FIX-089 (ClaseE): the shared class row, the places «N de M», no pill.
    const card = within(screen.getByRole("button", { name: /^Reformer Pilates \d/ }));
    expect(card.getByText("Reformer Pilates")).toHaveStyle({ fontSize: 15 });
    expect(card.getByText("Emma Vargas")).toHaveStyle({ color: "#93615D", fontSize: 13 });
    expect(card.getByText("6 de 12")).toHaveStyle({ fontWeight: "600" });
    expect(card.queryByTestId("exception-pill")).toBeNull();
    expect(
      screen.getByText(/^(Hoy|[A-ZÁÉÍÓÚ][a-záéíóú]+ \d+ de [a-z]+) · 1 clase$/),
    ).toBeOnTheScreen();
  });

  // FIX-089: a full class is the exception, so only it takes the Rubor pill.
  it("draws a full class with the exception pill", async () => {
    const full = { ...session, id: "session-full", bookedCount: 12, availableSeats: 0 };
    const screen = await openLucia({
      ...assistantRoutes(),
      [`/api/v1/sessions?branchId=branch-centro&from=${encodeURIComponent(from)}&until=${encodeURIComponent(until)}&limit=100&includeCancelled=true`]:
        () => jsonResponse([session, full]),
    });

    await fireEvent.press(screen.getByRole("button", { name: "Reservar clase" }));
    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /^Reformer Pilates \d/ })).toHaveLength(2);
    });
    const cards = screen
      .getAllByRole("button", { name: /^Reformer Pilates \d/ })
      .map((card) => within(card));
    expect(cards[0].getByText("6 de 12")).toBeOnTheScreen();
    expect(cards[0].queryByTestId("exception-pill")).toBeNull();
    expect(cards[1].getByTestId("exception-pill")).toHaveStyle({ backgroundColor: "#E7CCBF" });
    expect(cards[1].getByText("Completa")).toBeOnTheScreen();
  });
});
