import { fireEvent, render } from "@testing-library/react-native";
import { StyleSheet, Text } from "react-native";

import { StateScreen } from "./state-screen";

const hidden = { includeHiddenElements: true };

// Follow-up 225 §6: an empty, pending, success, or error state centred in the
// space between the top bar and the tab bar (C05b, C11, C11c).
describe("StateScreen", () => {
  it("centres a 72 pt Rosa tinte disc, a Lora 24 title, and a Texto tenue note", async () => {
    const screen = await render(
      <StateScreen
        icon="calendar"
        note="Cuando reserves una clase, aparecerá aquí."
        testID="state"
        title="Aún no tienes reservas"
      />,
    );

    expect(screen.getByTestId("state")).toHaveStyle({
      alignItems: "center",
      flex: 1,
      gap: 12,
      justifyContent: "center",
    });
    expect(screen.getByTestId("state-screen-disc")).toHaveStyle({
      alignItems: "center",
      backgroundColor: "#F2E4E1",
      borderRadius: 36,
      height: 72,
      justifyContent: "center",
      width: 72,
    });
    const glyph = screen.getByTestId("state-screen-icon-calendar", hidden);
    expect(glyph).toHaveProp("stroke", "#93615D");
    expect(glyph).toHaveProp("strokeWidth", 1.5);
    expect(glyph).toHaveProp("width", 32);
    expect(screen.getByText("Aún no tienes reservas")).toHaveStyle({
      color: "#4A4A4A",
      fontFamily: "Lora_400Regular",
      fontSize: 24,
      textAlign: "center",
    });
    expect(screen.getByText("Cuando reserves una clase, aparecerá aquí.")).toHaveStyle({
      color: "#6F6662",
      fontSize: 15,
      textAlign: "center",
    });
    expect(screen.getByText("Aún no tienes reservas")).toHaveProp("accessibilityRole", "header");
  });

  it("draws the error disc on #F7E5E0 with an Error glyph", async () => {
    const screen = await render(
      <StateScreen icon="cross" title="No pudimos confirmar tu pago" tone="error" />,
    );

    expect(screen.getByTestId("state-screen-disc")).toHaveStyle({ backgroundColor: "#F7E5E0" });
    expect(screen.getByTestId("state-screen-icon-cross", hidden)).toHaveProp("stroke", "#A04E3E");
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
    expect(primary).toHaveStyle({ backgroundColor: "#B78380", borderRadius: 14 });
    await fireEvent.press(primary);
    expect(home).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Ver mis pagos")).toHaveStyle({ color: "#7D4F4B" });
    await fireEvent.press(screen.getByRole("button", { name: "Ver mis pagos" }));
    expect(book).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Detalles")).toBeOnTheScreen();
    expect(screen.getByTestId("state-screen-actions")).toHaveStyle({ marginTop: 8 });
  });

  it("stands in a list without the vertical centring, bare or on Lino", async () => {
    const screen = await render(
      <>
        <StateScreen icon="bell" layout="inList" testID="bare" title="Sin avisos" />
        <StateScreen icon="card" layout="card" testID="card" title="Sin plan activo" />
      </>,
    );

    const bare = StyleSheet.flatten(screen.getByTestId("bare").props.style);
    expect(bare).not.toHaveProperty("flex");
    expect(bare).not.toHaveProperty("backgroundColor");
    expect(screen.getByTestId("card")).toHaveStyle({
      backgroundColor: "#F5EFE9",
      borderRadius: 16,
      paddingHorizontal: 24,
      paddingVertical: 32,
    });
  });
});
