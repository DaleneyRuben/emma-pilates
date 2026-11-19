import { fireEvent, render } from "@testing-library/react-native";
import { StyleSheet, Text } from "react-native";

import { StateScreen } from "./state-screen";

const hidden = { includeHiddenElements: true };

// Follow-up 225 §6: an empty, pending, success, or error state centred in the
// space between the top bar and the tab bar (C05b, C11, C11c).
describe("StateScreen", () => {
  it("centres the glyph alone, a Lora 24 title, and a note, all Rosa profundo", async () => {
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
    expect(screen.queryByTestId("state-screen-disc", hidden)).toBeNull();
    const glyph = screen.getByTestId("state-screen-icon-calendar", hidden);
    expect(glyph).toHaveProp("stroke", "#93615D");
    expect(glyph).toHaveProp("strokeWidth", 1.5);
    expect(glyph).toHaveProp("width", 32);
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

  it("says an error in words, with the same plain glyph", async () => {
    const screen = await render(
      <StateScreen icon="cross" title="No pudimos confirmar tu pago" tone="error" />,
    );

    expect(screen.queryByTestId("state-screen-disc", hidden)).toBeNull();
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
    expect(primary).toHaveStyle({ backgroundColor: "#93615D", borderRadius: 12 });
    await fireEvent.press(primary);
    expect(home).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Ver mis pagos")).toHaveStyle({ color: "#93615D" });
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
      backgroundColor: "#F9F4F2",
      borderColor: "#CDA697",
      borderRadius: 16,
      borderWidth: 1,
      paddingHorizontal: 24,
      paddingVertical: 32,
    });
  });
});

// FIX-082, FIX-089: `plainIcon` is kept for callers; every glyph is plain.
describe("StateScreen with a plain icon", () => {
  it("draws the glyph without the disc", async () => {
    const screen = await render(
      <StateScreen icon="receipt" plainIcon title="Aún no tienes facturas" />,
    );

    expect(screen.queryByTestId("state-screen-disc", hidden)).toBeNull();
    expect(screen.getByTestId("state-screen-icon-receipt", hidden)).toHaveProp("stroke", "#93615D");
  });
});
