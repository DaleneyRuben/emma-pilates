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
  afterEach(() => {
    cleanup();
    clearMobileQueryCache();
  });

  it("draws the search result with the avatar and the chevron", async () => {
    const screen = await openClientSearch(assistantRoutes());

    await fireEvent.changeText(
      screen.getByPlaceholderText("Buscar por nombre, teléfono o correo"),
      "luc",
    );
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Ver cliente Lucía Fernández" })).toBeOnTheScreen();
    });

    const row = screen.getByRole("button", { name: "Ver cliente Lucía Fernández" });
    expect(row).toHaveStyle({ alignItems: "center", flexDirection: "row", gap: 14 });
    expect(screen.getByTestId("avatar-circle")).toHaveStyle({ height: 42, width: 42 });
    expect(screen.getByText("L")).toHaveStyle({ fontFamily: "Lora_400Regular", fontSize: 16 });
    expect(screen.getByText("Lucía Fernández")).toHaveStyle({ color: "#4A4A4A", fontSize: 16 });
    expect(screen.getByText("+591 70011001 · lucia@example.com")).toHaveStyle({
      color: "#766D69",
      fontSize: 13,
    });
    const chevron = screen.getByTestId("chevron", hidden);
    expect(chevron).toHaveProp("stroke", "#B78380");
    expect(chevron).toHaveProp("width", 19);
  });

  it("draws the picker pill and the Session card on the booking screen", async () => {
    const screen = await openLucia(assistantRoutes());

    await fireEvent.press(screen.getByRole("button", { name: "Reservar clase" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Sucursal: Centro" })).toBeOnTheScreen();
    });
    expect(screen.getByText("Reservando para: Lucía Fernández")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Sucursal: Centro" })).toHaveStyle({
      borderRadius: 999,
      minHeight: 44,
    });
    expect(screen.getByTestId("glyph-pin", hidden)).toHaveProp("width", 17);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Reformer Pilates \d/ })).toBeOnTheScreen();
    });
    const card = within(screen.getByRole("button", { name: /^Reformer Pilates \d/ }));
    expect(card.getByText("Reformer Pilates")).toHaveStyle({
      fontFamily: "Lora_500Medium",
      fontSize: 19,
    });
    expect(card.getByText("Emma Vargas")).toHaveStyle({ color: "#6E6663", fontSize: 14 });
    expect(card.getByTestId("glyph-person", hidden)).toHaveProp("width", 17);
    expect(card.getByText("6 cupos")).toBeOnTheScreen();
    // S04's result row stays mounted under S07, so the chevron is read inside the card.
    const chevron = card.getByTestId("chevron", hidden);
    expect(chevron).toHaveProp("stroke", "#B78380");
    expect(chevron).toHaveProp("width", 19);
  });

  // MOB-047: follow-up 84's seat pill — the seats on Palo de rosa tinte, a
  // full class on the neutral pill, 12 pt weight 500, never red, no dot.
  it("draws the seat pills as follow-up 84 settles them", async () => {
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
    expect(cards[0].getByTestId("seat-pill")).toHaveStyle({
      backgroundColor: "#EFE0DC",
      borderRadius: 999,
    });
    expect(cards[0].getByText("6 cupos")).toHaveStyle({
      color: "#7A4F4B",
      fontSize: 12,
      fontWeight: "500",
    });
    expect(cards[1].getByTestId("seat-pill")).toHaveStyle({
      backgroundColor: "rgba(216,201,187,0.34)",
    });
    expect(cards[1].getByText("Llena")).toHaveStyle({ color: "#6E6663", fontSize: 12 });
  });
});
