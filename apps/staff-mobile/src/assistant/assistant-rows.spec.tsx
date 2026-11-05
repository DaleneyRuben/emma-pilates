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
      expect(screen.getByRole("button", { name: "Ver cliente Lucía Fernández" })).toBeOnTheScreen();
    });

    const row = screen.getByRole("button", { name: "Ver cliente Lucía Fernández" });
    expect(row).toHaveStyle({ alignItems: "center", flexDirection: "row", minHeight: 64 });
    expect(screen.getByText("LF")).toHaveStyle({ fontFamily: "Lora_400Regular" });
    expect(screen.getByText("Lucía Fernández")).toHaveStyle({ color: "#4A4A4A", fontSize: 16 });
    expect(screen.getByText("🇧🇴 +591 70011001 · lucia@example.com")).toHaveStyle({
      color: "#6F6662",
      fontSize: 13,
    });
    expect(screen.getByTestId("chevron", hidden)).toHaveProp("stroke", "#6F6662");
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
    // v2 S07: the start in Lora 20, the class over its Trainer, the seat pill.
    const card = within(screen.getByRole("button", { name: /^Reformer Pilates \d/ }));
    expect(card.getByText("Reformer Pilates")).toHaveStyle({ fontSize: 16 });
    expect(card.getByText("Emma Vargas")).toHaveStyle({ color: "#6F6662", fontSize: 13 });
    expect(card.getByText("6 cupos").parent).toHaveStyle({ backgroundColor: "#F2E4E1" });
    expect(
      screen.getByText(/^(Hoy|[A-ZÁÉÍÓÚ][a-záéíóú]+ \d+ de [a-z]+) · 1 clase$/),
    ).toBeOnTheScreen();
  });

  // MOB-047: follow-up 84's seat pill — the seats on Palo de rosa tinte, a
  // full class on the neutral pill, 12 pt weight 500, never red, no dot.
  it("draws a full class on the neutral pill", async () => {
    const full = { ...session, id: "session-full", bookedCount: 12, availableSeats: 0 };
    const screen = await openLucia({
      ...assistantRoutes(),
      [`/api/v1/sessions?branchId=branch-centro&from=${encodeURIComponent(from)}&until=${encodeURIComponent(until)}&limit=100`]:
        () => jsonResponse([session, full]),
    });

    await fireEvent.press(screen.getByRole("button", { name: "Reservar clase" }));
    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /^Reformer Pilates \d/ })).toHaveLength(2);
    });
    const cards = screen
      .getAllByRole("button", { name: /^Reformer Pilates \d/ })
      .map((card) => within(card));
    expect(cards[0].getByText("6 cupos").parent).toHaveStyle({ backgroundColor: "#F2E4E1" });
    expect(cards[1].getByText("Completa").parent).toHaveStyle({ backgroundColor: "#E6DBD0" });
  });
});
