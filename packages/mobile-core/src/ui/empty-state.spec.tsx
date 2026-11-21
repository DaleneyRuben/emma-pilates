import { render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { EmptyState } from "./empty-state";
import { textVariants } from "./type-scale";
import { PrimaryButton } from "./primary-button";

const hidden = { includeHiddenElements: true };

type Instance = { children: (Instance | string)[]; props: Record<string, unknown> };

/** The props of every shape drawn inside an SVG, as Jest renders them. */
function svgShapes(instance: Instance): Record<string, unknown>[] {
  return instance.children.flatMap((child) =>
    typeof child === "string" ? [] : [child.props, ...svgShapes(child)],
  );
}

// Follow-up 225 §6: every empty state draws the block of `StateScreen`: a
// glyph on a 50 disc (Rosa Emma), a Lora 24 title, and a 15 note,
// all Rosa profundo. The variants keep where it stands.
describe("EmptyState", () => {
  it("draws the framed variant as the in-list block on Lino", async () => {
    const screen = await render(
      <EmptyState
        icon="card"
        message="Esta clienta no tiene clases disponibles."
        title="Sin plan activo"
      />,
    );

    const title = screen.getByText("Sin plan activo");
    expect(title).toHaveStyle({ ...textVariants["titulo-fila"], textAlign: "center" });
    const block = title.parent;
    expect(block).toHaveStyle({
      backgroundColor: "#FFFBFB",
      borderRadius: 20,
    });
    const flat = StyleSheet.flatten(block?.props.style);
    expect(flat).not.toHaveProperty("flex");
    expect(screen.getByTestId("empty-state-disc")).toBeOnTheScreen();
    const icon = screen.getByTestId("empty-state-icon-card", hidden);
    expect(icon).toHaveProp("stroke", "#93615D");
    expect(icon).toHaveProp("width", 28);
    expect(screen.getByText("Esta clienta no tiene clases disponibles.")).toHaveStyle({
      ...textVariants.cuerpo,
      color: "#93615D",
      textAlign: "center",
    });
  });

  it("draws the panel variant as the same card, uncentred", async () => {
    const screen = await render(
      <EmptyState
        icon="person"
        message="Busca por nombre, teléfono o correo en el panel izquierdo."
        title="Selecciona un cliente para ver sus detalles"
        variant="panel"
      />,
    );

    const flat = StyleSheet.flatten(
      screen.getByText("Selecciona un cliente para ver sus detalles").parent?.props.style,
    );
    expect(flat).toHaveProperty("backgroundColor", "#FFFBFB");
    expect(flat).not.toHaveProperty("flex");
    expect(screen.getByTestId("empty-state-icon-person", hidden)).toHaveProp("stroke", "#93615D");
  });
});

describe("EmptyState plain variant", () => {
  it("fills the screen with the card at its top", async () => {
    const screen = await render(
      <EmptyState
        icon="clock"
        message="Aquí aparecerán tus clases una vez que registremos tu asistencia en el estudio."
        title="Aún no tienes clases en tu historial."
        variant="plain"
      />,
    );

    const title = screen.getByText("Aún no tienes clases en tu historial.");
    expect(title).toHaveStyle(textVariants["titulo-fila"]);
    expect(title.parent).toHaveStyle({ alignItems: "center", backgroundColor: "#FFFBFB" });
    expect(title.parent?.parent).toHaveStyle({ flex: 1 });
    const icon = screen.getByTestId("empty-state-icon-clock", hidden);
    expect(icon).toHaveProp("stroke", "#93615D");
    expect(icon).toHaveProp("width", 28);
  });

  it("stands with the title alone, as S22's does", async () => {
    const screen = await render(
      <EmptyState title="Esta clienta aún no tiene clases en su historial." variant="plain" />,
    );

    expect(screen.getByText("Esta clienta aún no tiene clases en su historial.")).toHaveStyle(
      textVariants["titulo-fila"],
    );
    expect(screen.queryByTestId("empty-state-disc")).toBeNull();
  });

  it("keeps the bell and the calendar shapes", async () => {
    const screen = await render(
      <>
        <EmptyState icon="bell" title="No tienes notificaciones." variant="plain" />
        <EmptyState
          icon="calendar"
          title="Esta clienta no tiene reservas próximas."
          variant="plain"
        />
      </>,
    );

    expect(svgShapes(screen.getByTestId("empty-state-icon-bell", hidden))).toContainEqual(
      expect.objectContaining({ d: "M6 10a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 14 6 10z" }),
    );
    expect(svgShapes(screen.getByTestId("empty-state-icon-calendar", hidden))).toContainEqual(
      expect.objectContaining({ x1: 8, y1: 3.5 }),
    );
  });

  it("places the action last, 8 under the note", async () => {
    const screen = await render(
      <EmptyState
        action={<PrimaryButton label="Reservar una clase" onPress={() => undefined} />}
        icon="calendar"
        message="Puedes reservarle una clase desde el horario del estudio."
        title="Esta clienta no tiene reservas próximas."
        variant="plain"
      />,
    );

    const action = screen.getByTestId("empty-state-action");
    expect(action).toHaveStyle({ marginTop: 8, minWidth: 220 });
    expect(screen.getByRole("button", { name: "Reservar una clase" })).toBeOnTheScreen();
    const block = screen.getByText("Esta clienta no tiene reservas próximas.").parent;
    expect(block?.children.indexOf(action)).toBe(block!.children.length - 1);
  });
});
