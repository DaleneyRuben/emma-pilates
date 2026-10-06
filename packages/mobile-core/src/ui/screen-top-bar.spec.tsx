import { fireEvent, render } from "@testing-library/react-native";
import { Text } from "react-native";

import { BackLink, ScreenTopBar } from "../index";
import { colors, spacing } from "./tokens";

const hidden = { includeHiddenElements: true };

// MOB-034: the export's top bar on the remaining screens and its variants.
describe("ScreenTopBar on an app screen", () => {
  it("spans the screen's padding and names the screen in its title", async () => {
    const onBack = jest.fn();
    const screen = await render(<ScreenTopBar fullBleed onBack={onBack} title="Mi crédito" />);

    expect(screen.getByTestId("screen-top-bar")).toHaveStyle({
      marginHorizontal: -spacing.lg,
      marginTop: -spacing.lg,
    });
    expect(screen.getByLabelText("Mi crédito")).toHaveStyle({ fontSize: 19 });
    await fireEvent.press(screen.getByRole("button", { name: "Volver" }));
    expect(onBack).toHaveBeenCalled();
  });

  // MOB-038: the frames' header rule, which reads on Superficie.
  it("draws its bottom rule in the frames' header rule tone", async () => {
    const screen = await render(<ScreenTopBar onBack={jest.fn()} title="Mi crédito" />);

    expect(screen.getByTestId("screen-top-bar")).toHaveStyle({
      borderBottomColor: "#EFE7DE",
      borderBottomWidth: 1,
    });
  });

  it("draws 04's muted context label instead of a title", async () => {
    const screen = await render(
      <ScreenTopBar fullBleed onBack={jest.fn()} title="Reservar una clase" tone="context" />,
    );

    expect(screen.getByText("Reservar una clase")).toHaveStyle({
      color: colors.textMuted,
      fontSize: 14,
    });
    expect(screen.queryByRole("header")).toBeNull();
  });

  it("puts an action at the end of the bar (19 «Marcar leídas», S16 «Nuevo horario»)", async () => {
    const screen = await render(
      <ScreenTopBar
        action={<Text>Marcar leídas</Text>}
        fullBleed
        onBack={jest.fn()}
        title="Notificaciones"
      />,
    );

    expect(screen.getByText("Marcar leídas")).toBeOnTheScreen();
  });
});

describe("BackLink above a large title (S03, S05–S10)", () => {
  it("draws the chevron, not «← Volver»", async () => {
    const onPress = jest.fn();
    const screen = await render(<BackLink onPress={onPress} />);

    expect(screen.queryByText("← Volver")).toBeNull();
    expect(screen.getByTestId("back-chevron", hidden)).toHaveProp("stroke", colors.text);
    await fireEvent.press(screen.getByRole("button", { name: "Volver" }));
    expect(onPress).toHaveBeenCalled();
  });
});
