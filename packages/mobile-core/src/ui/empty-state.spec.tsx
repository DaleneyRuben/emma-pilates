import { render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { EmptyState } from "./empty-state";
import { PrimaryButton } from "./primary-button";

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

// MOB-040: 07 and S22 (like 19, S20, and S21) centre a bare empty state on
// the screen: a quiet 34 pt clock, a Lora 21 title, and an optional note.
describe("EmptyState plain variant", () => {
  it("draws the bare clock, Lora 21 title, and 14 pt note on the screen", async () => {
    const screen = await render(
      <EmptyState
        icon="clock"
        message="Aquí aparecerán tus clases una vez que registremos tu asistencia en el estudio."
        title="Aún no tienes clases en tu historial."
        variant="plain"
      />,
    );

    const title = screen.getByText("Aún no tienes clases en tu historial.");
    expect(title).toHaveStyle({ fontFamily: "Lora_500Medium", fontSize: 21, textAlign: "center" });
    expect(StyleSheet.flatten(title.parent?.props.style)).not.toHaveProperty("backgroundColor");
    expect(StyleSheet.flatten(title.parent?.props.style)).not.toHaveProperty("borderWidth");
    const icon = screen.getByTestId("empty-state-icon-clock", hidden);
    expect(icon).toHaveProp("stroke", "#C4BAB6");
    expect(icon).toHaveProp("width", 34);
    expect(
      screen.getByText(
        "Aquí aparecerán tus clases una vez que registremos tu asistencia en el estudio.",
      ),
    ).toHaveStyle({ color: "#766D69", fontSize: 14, maxWidth: 260, textAlign: "center" });
  });

  it("stands with the title alone, as S22's does", async () => {
    const screen = await render(
      <EmptyState title="Esta clienta aún no tiene clases en su historial." variant="plain" />,
    );

    expect(screen.getByText("Esta clienta aún no tiene clases en su historial.")).toHaveStyle({
      fontSize: 21,
    });
    expect(screen.queryByTestId("empty-state-icon-clock", hidden)).toBeNull();
  });

  // MOB-041: 19 and S20 draw the bell, S21 the calendar, all in the quiet tone.
  it("draws the bell and the calendar in the same quiet tone", async () => {
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

    for (const name of ["bell", "calendar"]) {
      const icon = screen.getByTestId(`empty-state-icon-${name}`, hidden);
      expect(icon).toHaveProp("stroke", "#C4BAB6");
      expect(icon).toHaveProp("strokeWidth", 1.1);
      expect(icon).toHaveProp("width", 34);
    }
    const bell = screen.getByTestId("empty-state-icon-bell", hidden);
    expect(
      bell.findAllByProps({ d: "M6 10a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 14 6 10z" }),
    ).not.toHaveLength(0);
    const calendar = screen.getByTestId("empty-state-icon-calendar", hidden);
    expect(calendar.findAllByProps({ x1: 8, y1: 3.5 })).not.toHaveLength(0);
  });

  // MOB-041: S21 puts «Reservar una clase» 6 pt under the note, 220 pt wide.
  it("places the action under the note", async () => {
    const screen = await render(
      <EmptyState
        action={<PrimaryButton label="Reservar una clase" onPress={jest.fn()} />}
        icon="calendar"
        message="Puedes reservarle una clase desde el horario del estudio."
        title="Esta clienta no tiene reservas próximas."
        variant="plain"
      />,
    );

    const action = screen.getByTestId("empty-state-action");
    expect(action).toHaveStyle({ marginTop: 6, minWidth: 220 });
    expect(screen.getByRole("button", { name: "Reservar una clase" })).toBeOnTheScreen();
    const block = screen.getByText("Esta clienta no tiene reservas próximas.").parent;
    expect(block?.children.indexOf(action)).toBe(block!.children.length - 1);
  });
});
