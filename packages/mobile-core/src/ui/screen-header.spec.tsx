import { fireEvent, render } from "@testing-library/react-native";
import { Text } from "react-native";

import { ScreenHeader, ScreenTopBar } from "../index";
import { spacing } from "./tokens";

// FIX-089 (EncabezadoA, owner 2026-11-19): one header for both apps — the back
// arrow on its own row, then the screen's large Lora title under it.
describe("ScreenHeader", () => {
  it("puts the back arrow on its own row above a large Lora title", async () => {
    const onBack = jest.fn();
    const screen = await render(<ScreenHeader onBack={onBack} title="Mi plan" />);

    expect(screen.getByRole("header", { name: "Mi plan" })).toHaveStyle({
      color: "#93615D",
      fontFamily: "Lora_500Medium",
      fontSize: 30,
    });
    const back = screen.getByRole("button", { name: "Volver" });
    expect(back).toHaveStyle({ height: 44, width: 44 });
    await fireEvent.press(back);
    expect(onBack).toHaveBeenCalled();
  });

  it("draws no rule under the title", async () => {
    const screen = await render(<ScreenHeader onBack={jest.fn()} title="Mi plan" />);

    expect(screen.getByTestId("screen-header")).not.toHaveStyle({ borderBottomWidth: 1 });
  });

  it("keeps the chevron inside the content edge, so a scroll view never clips it", async () => {
    const screen = await render(<ScreenHeader onBack={jest.fn()} title="Reformer" />);

    expect(screen.getByRole("button", { name: "Volver" })).not.toHaveStyle({ marginLeft: -10 });
  });

  it("draws only the title on a tab's root screen", async () => {
    const screen = await render(<ScreenHeader title="Mis reservas" />);

    expect(screen.queryByRole("button", { name: "Volver" })).toBeNull();
    expect(screen.getByRole("header", { name: "Mis reservas" })).toBeOnTheScreen();
  });

  it("puts an action at the end of the arrow's row and a quiet line under the title", async () => {
    const screen = await render(
      <ScreenHeader
        action={<Text>Marcar leídas</Text>}
        onBack={jest.fn()}
        subtitle="3 sin leer"
        title="Notificaciones"
      />,
    );

    expect(screen.getByText("Marcar leídas")).toBeOnTheScreen();
    expect(screen.getByText("3 sin leer")).toHaveStyle({ color: "#93615D", fontSize: 14 });
  });

  it("spans a padded Screen's padding when full bleed", async () => {
    const screen = await render(<ScreenHeader fullBleed onBack={jest.fn()} title="Mi crédito" />);

    expect(screen.getByTestId("screen-header")).toHaveStyle({
      marginHorizontal: -spacing.lg,
      marginTop: -spacing.lg,
    });
  });
});

describe("ScreenTopBar", () => {
  // Its callers outside a padded Screen (Recuperar contraseña) relied on the
  // bar's own 16 pt inset; full bleed spans the Screen's padding and keeps it.
  it("keeps its own 16 pt inset, with or without full bleed", async () => {
    const bare = await render(<ScreenTopBar onBack={jest.fn()} title="Recuperar contraseña" />);
    expect(bare.getByTestId("screen-top-bar")).toHaveStyle({ paddingHorizontal: spacing.lg });

    const bleed = await render(<ScreenTopBar fullBleed onBack={jest.fn()} title="Mi plan" />);
    expect(bleed.getByTestId("screen-top-bar")).toHaveStyle({
      marginHorizontal: -spacing.lg,
      paddingHorizontal: spacing.lg,
    });
  });

  it("is the shared header", async () => {
    const screen = await render(<ScreenTopBar onBack={jest.fn()} title="Mi crédito" />);

    expect(screen.getByRole("header", { name: "Mi crédito" })).toHaveStyle({ fontSize: 30 });
  });
});
