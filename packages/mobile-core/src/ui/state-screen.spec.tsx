import { fireEvent, render } from "@testing-library/react-native";
import { StyleSheet, Text } from "react-native";

import { StateScreen } from "./state-screen";

const hidden = { includeHiddenElements: true };

// Rosa Emma (C05b, E-A13): every empty, pending, success, or error state is a
// white card with its glyph on a 50 disc, a Lora 24 title and a note.
describe("StateScreen", () => {
  it("draws the glyph on a disc, a Lora 24 title, and a note in a white card", async () => {
    const screen = await render(
      <StateScreen
        icon="calendar"
        note="Cuando reserves una clase, aparecerá aquí."
        testID="state"
        title="Aún no tienes reservas"
      />,
    );

    expect(screen.getByTestId("state")).toHaveStyle({ flex: 1 });
    expect(screen.getByText("Aún no tienes reservas").parent).toHaveStyle({
      alignItems: "center",
      backgroundColor: "#FFFBFB",
      borderRadius: 20,
      gap: 12,
    });
    expect(screen.getByTestId("state-screen-disc", hidden)).toHaveStyle({
      backgroundColor: "#FEF6F2",
      borderColor: "#E7CCBF",
      height: 64,
      width: 64,
    });
    const glyph = screen.getByTestId("state-screen-icon-calendar", hidden);
    expect(glyph).toHaveProp("stroke", "#93615D");
    expect(glyph).toHaveProp("width", 28);
    expect(screen.getByText("Aún no tienes reservas")).toHaveStyle({
      color: "#93615D",
      fontFamily: "Lora_400Regular",
      fontSize: 24,
      textAlign: "center",
    });
    expect(screen.getByText("Cuando reserves una clase, aparecerá aquí.")).toHaveStyle({
      color: "#93615D",
      fontSize: 15,
      textAlign: "center",
    });
    expect(screen.getByText("Aún no tienes reservas")).toHaveProp("accessibilityRole", "header");
  });

  it("says an error in words, with the same glyph on its disc", async () => {
    const screen = await render(
      <StateScreen icon="cross" title="No pudimos confirmar tu pago" tone="error" />,
    );

    expect(screen.getByTestId("state-screen-disc", hidden)).toBeOnTheScreen();
    expect(screen.getByTestId("state-screen-icon-cross", hidden)).toHaveProp("stroke", "#93615D");
  });

  it("puts a primary button and an optional text button under the note", async () => {
    const book = jest.fn();
    const home = jest.fn();
    const screen = await render(
      <StateScreen
        icon="hourglass"
        note="Te avisaremos apenas esté listo."
        primaryAction={{ label: "Volver al inicio", onPress: home, testID: "go-home" }}
        textAction={{ label: "Ver mis pagos", onPress: book }}
        title="Tu pago está en revisión"
      >
        <Text>Detalles</Text>
      </StateScreen>,
    );

    const primary = screen.getByTestId("go-home");
    expect(primary).toHaveStyle({ backgroundColor: "#93615D", borderRadius: 16 });
    await fireEvent.press(primary);
    expect(home).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Ver mis pagos")).toHaveStyle({ color: "#93615D" });
    await fireEvent.press(screen.getByRole("button", { name: "Ver mis pagos" }));
    expect(book).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Detalles")).toBeOnTheScreen();
    expect(screen.getByTestId("state-screen-actions")).toHaveStyle({ alignSelf: "stretch" });
  });

  it("stands in a list as the same card, without filling the screen", async () => {
    const screen = await render(
      <>
        <StateScreen icon="bell" layout="inList" testID="bare" title="Sin avisos" />
        <StateScreen icon="card" layout="card" testID="card" title="Sin plan activo" />
      </>,
    );

    const bare = StyleSheet.flatten(screen.getByTestId("bare").props.style);
    expect(bare).not.toHaveProperty("flex");
    expect(screen.getByTestId("card")).toHaveStyle({
      backgroundColor: "#FFFBFB",
      borderRadius: 20,
      paddingHorizontal: 20,
      paddingVertical: 28,
    });
  });
});
