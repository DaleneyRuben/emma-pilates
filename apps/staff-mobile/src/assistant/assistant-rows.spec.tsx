import { cleanup, fireEvent, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { assistantRoutes, openClientSearch, openLucia } from "./assistant-fixtures";

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
      expect(screen.getByText("Reservando para: Lucía Fernández")).toBeOnTheScreen();
    });
    expect(screen.getByRole("button", { name: "Sucursal: Centro" })).toHaveStyle({
      borderRadius: 999,
      minHeight: 44,
    });
    expect(screen.getByTestId("glyph-pin", hidden)).toHaveProp("width", 17);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Reformer Pilates \d/ })).toBeOnTheScreen();
    });
    expect(screen.getByText("Reformer Pilates")).toHaveStyle({
      fontFamily: "Lora_500Medium",
      fontSize: 19,
    });
    expect(screen.getByText("Emma Vargas")).toHaveStyle({ color: "#6E6663", fontSize: 14 });
    expect(screen.getByTestId("glyph-person", hidden)).toHaveProp("width", 17);
    expect(screen.getByText("6 cupos")).toBeOnTheScreen();
    const chevron = screen.getByTestId("chevron", hidden);
    expect(chevron).toHaveProp("stroke", "#B78380");
    expect(chevron).toHaveProp("width", 19);
  });
});
