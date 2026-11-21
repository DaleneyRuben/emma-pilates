import { fireEvent, render } from "@testing-library/react-native";

import { IconRow, IconRowGroup } from "./icon-row";
import { textVariants } from "./type-scale";

const hidden = { includeHiddenElements: true };

// Follow-up 225 §3 and the system board's «05 · Filas con ícono».
describe("IconRow", () => {
  it("puts an 18 pt Rosa profundo glyph alone, no disc, before a titulo-fila label", async () => {
    const screen = await render(
      <IconRow icon="calendar" label="30 días desde la fecha de inicio" />,
    );

    const label = screen.getByText("30 días desde la fecha de inicio");
    expect(label).toHaveStyle({ ...textVariants["titulo-fila"], color: "#93615D" });
    expect(label.parent).toHaveStyle({
      alignItems: "center",
      flexDirection: "row",
      gap: 12,
      minHeight: 56,
      paddingHorizontal: 16,
    });
    expect(screen.queryByTestId("icon-row-disc", hidden)).toBeNull();
    const glyph = screen.getByTestId("glyph-calendar", hidden);
    expect(glyph).toHaveProp("width", 18);
    expect(glyph).toHaveProp("stroke", "#93615D");
    expect(glyph).toHaveProp("strokeWidth", 1.5);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByTestId("chevron", hidden)).toBeNull();
  });

  it("shows a compacto value and a chevron, and presses as one button", async () => {
    const onPress = jest.fn();
    const screen = await render(
      <IconRow chevron icon="bell" label="Notificaciones" onPress={onPress} value="Activadas" />,
    );

    expect(screen.getByText("Activadas")).toHaveStyle({
      ...textVariants.compacto,
      color: "#93615D",
    });
    const chevron = screen.getByTestId("chevron", hidden);
    expect(chevron).toHaveProp("stroke", "#93615D");
    expect(chevron).toHaveProp("width", 16);
    const row = screen.getByRole("button", { name: "Notificaciones, Activadas" });
    await fireEvent.press(row);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

// MOB-074 walk: a long value («Centro, Equipetrol, Urubó») squeezed the label
// to «Sucursale / s» on the Staff Perfil; the label keeps its width and the
// value wraps instead.
describe("IconRow with a long value", () => {
  it("keeps the label whole and lets the value wrap", async () => {
    const screen = await render(
      <IconRow icon="pin" label="Sucursales" value="Centro, Equipetrol, Urubó" />,
    );

    expect(screen.getByText("Sucursales")).toHaveStyle({ flexShrink: 0 });
    expect(screen.getByText("Centro, Equipetrol, Urubó")).toHaveStyle({
      flexShrink: 1,
      textAlign: "right",
    });
  });
});

describe("IconRowGroup", () => {
  // A long label alone (a note row) wraps instead of running off the row.
  it("wraps a long label that has no value", async () => {
    const screen = await render(
      <IconRow icon="clock" label="Podrás marcar asistencia cuando empiece la clase." />,
    );

    expect(screen.getByText("Podrás marcar asistencia cuando empiece la clase.")).toHaveStyle({
      flexShrink: 1,
    });
  });

  it("draws Crema at radius 16 with an Arcilla border and a Rubor hairline inset 46", async () => {
    const screen = await render(
      <IconRowGroup testID="group">
        <IconRow icon="calendar" label="Uno" />
        {null}
        <IconRow icon="clock" label="Dos" />
        <IconRow icon="pin" label="Tres" />
      </IconRowGroup>,
    );

    const group = screen.getByTestId("group");
    expect(group).toHaveStyle({
      backgroundColor: "#FFFBFB",
      borderRadius: 20,
    });
    const hairlines = screen.getAllByTestId("icon-row-hairline");
    expect(hairlines).toHaveLength(2);
    expect(hairlines[0]).toHaveStyle({ backgroundColor: "#F9E7DF", height: 1, marginLeft: 46 });
  });

  // Verification n.º 44 (follow-up 256 § 2): «Cerrar sesión» is the Error last
  // row in both apps, as S23 draws it.
  it("draws an error row like the others, without a disc or chevron", async () => {
    const screen = await render(
      <IconRow chevron icon="logout" label="Cerrar sesión" onPress={jest.fn()} tone="error" />,
    );

    expect(screen.queryByTestId("icon-row-disc", hidden)).toBeNull();
    expect(screen.getByText("Cerrar sesión")).toHaveStyle({
      ...textVariants["titulo-fila"],
      color: "#93615D",
    });
    expect(screen.queryByTestId("chevron", hidden)).toBeNull();
  });
});

// FIX-082 (design audit 2026-11-18): no tinted disc behind an icon. A plain
// group draws the glyph alone in Texto tenue, opt-in so the Staff app keeps
// its rows until its own pass.
describe("IconRowGroup plain", () => {
  it("draws each glyph without a disc and insets the hairline to the label", async () => {
    const screen = await render(
      <IconRowGroup plain>
        <IconRow icon="pin" label="Sucursal" value="Achumani" />
        <IconRow icon="logout" label="Cerrar sesión" onPress={jest.fn()} tone="error" />
      </IconRowGroup>,
    );

    expect(screen.queryByTestId("icon-row-disc", hidden)).toBeNull();
    expect(screen.getByTestId("glyph-pin", hidden)).toHaveProp("stroke", "#93615D");
    expect(screen.getByTestId("glyph-logout", hidden)).toHaveProp("stroke", "#93615D");
    expect(screen.getByTestId("icon-row-hairline")).toHaveStyle({ marginLeft: 46 });
  });
});
