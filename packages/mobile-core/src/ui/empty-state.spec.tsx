import { render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { EmptyState } from "./empty-state";

const hidden = { includeHiddenElements: true };

// MOB-039: S06's «Sin plan activo» and the tablet's empty panel, as the
// frames draw them.
describe("EmptyState", () => {
  it("frames a centred card icon, Lora title, and note in the dashed box", async () => {
    const screen = await render(
      <EmptyState
        icon="card"
        message="Esta clienta no tiene clases disponibles."
        title="Sin plan activo"
      />,
    );

    const title = screen.getByText("Sin plan activo");
    expect(title).toHaveStyle({
      fontFamily: "Lora_500Medium",
      fontSize: 19,
      textAlign: "center",
    });
    expect(title.parent).toHaveStyle({
      alignItems: "center",
      backgroundColor: "rgba(216,201,187,0.14)",
      borderColor: "#D8C9BB",
      borderRadius: 16,
      borderStyle: "dashed",
      borderWidth: 1,
    });
    expect(screen.getByTestId("empty-state-icon-card", hidden)).toHaveProp("stroke", "#B78380");
    expect(screen.getByText("Esta clienta no tiene clases disponibles.")).toHaveStyle({
      color: "#766D69",
      fontSize: 13,
      textAlign: "center",
    });
  });

  it("draws the panel variant bare, with the icon in a 64 pt circle", async () => {
    const screen = await render(
      <EmptyState
        icon="person"
        message="Busca por nombre, teléfono o correo en el panel izquierdo."
        title="Selecciona un cliente para ver sus detalles"
        variant="panel"
      />,
    );

    const title = screen.getByText("Selecciona un cliente para ver sus detalles");
    expect(title).toHaveStyle({ fontFamily: "Lora_400Regular", fontSize: 22 });
    expect(StyleSheet.flatten(title.parent?.props.style)).not.toHaveProperty("backgroundColor");
    expect(screen.getByTestId("empty-state-circle")).toHaveStyle({
      backgroundColor: "rgba(216,201,187,0.18)",
      borderColor: "#D8C9BB",
      borderRadius: 32,
      borderWidth: 1,
      height: 64,
      width: 64,
    });
    expect(screen.getByTestId("empty-state-icon-person", hidden)).toHaveProp("stroke", "#B78380");
    expect(
      screen.getByText("Busca por nombre, teléfono o correo en el panel izquierdo."),
    ).toHaveStyle({ fontSize: 14, maxWidth: 340 });
  });
});
