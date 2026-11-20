import { fireEvent, render } from "@testing-library/react-native";
import { Text } from "react-native";

import { SafeAreaProvider } from "react-native-safe-area-context";

import { Screen, ScreenHeader, ScreenTopBar } from "../index";
import { spacing } from "./tokens";

// Rosa Emma (follow-up 284): one header for both apps — a 200 band with the
// back button on its own row, then the screen's large Lora title under it.
const metrics = {
  frame: { height: 844, width: 390, x: 0, y: 0 },
  insets: { bottom: 34, left: 0, right: 0, top: 47 },
};
describe("ScreenHeader", () => {
  it("puts the back arrow on its own row above a large Lora title", async () => {
    const onBack = jest.fn();
    const screen = await render(<ScreenHeader onBack={onBack} title="Mi plan" />);

    expect(screen.getByRole("header", { name: "Mi plan" })).toHaveStyle({
      color: "#93615D",
      fontFamily: "Lora_400Regular",
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
    expect(screen.getByText("3 sin leer").parent).toHaveStyle({ backgroundColor: "#FFFBFB" });
  });

  it("draws a 200 band with rounded lower corners and a white back disc", async () => {
    const screen = await render(<ScreenHeader onBack={jest.fn()} title="Mi crédito" />);

    expect(screen.getByTestId("screen-header")).toHaveStyle({
      backgroundColor: "#E7CCBF",
      borderBottomLeftRadius: 28,
      borderBottomRightRadius: 28,
      paddingHorizontal: 20,
    });
    expect(screen.getByRole("button", { name: "Volver" })).toHaveStyle({
      backgroundColor: "#FFFBFB",
      borderRadius: 22,
    });
  });

  it("reaches past a padded Screen's padding and top safe area to its edges", async () => {
    const screen = await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <Screen>
          <ScreenHeader onBack={jest.fn()} title="Mi plan" />
        </Screen>
      </SafeAreaProvider>,
    );

    expect(screen.getByTestId("screen-header")).toHaveStyle({
      marginHorizontal: -spacing.lg,
      marginTop: -(spacing.lg + 47),
      paddingTop: spacing.lg + 47,
    });
  });

  it("puts the eyebrow on a white capsule and an accessory at the end of the title", async () => {
    const screen = await render(
      <ScreenHeader
        eyebrow="Instructora · Jueves 19"
        title="Hola, Daniela"
        titleAccessory={<Text>Campana</Text>}
      />,
    );

    expect(screen.getByText("Instructora · Jueves 19")).toHaveStyle({
      fontSize: 12,
      fontWeight: "700",
      textTransform: "uppercase",
    });
    expect(screen.getByText("Instructora · Jueves 19").parent).toHaveStyle({
      backgroundColor: "#FFFBFB",
    });
    expect(screen.getByText("Campana")).toBeOnTheScreen();
  });
});

describe("ScreenTopBar", () => {
  it("pads the band 20 pt on each side", async () => {
    const bare = await render(<ScreenTopBar onBack={jest.fn()} title="Recuperar contraseña" />);
    expect(bare.getByTestId("screen-top-bar")).toHaveStyle({ paddingHorizontal: 20 });
  });

  it("is the shared header", async () => {
    const screen = await render(<ScreenTopBar onBack={jest.fn()} title="Mi crédito" />);

    expect(screen.getByRole("header", { name: "Mi crédito" })).toHaveStyle({ fontSize: 30 });
  });
});
