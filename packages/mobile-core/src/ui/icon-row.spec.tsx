import { fireEvent, render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { IconRow, IconRowGroup } from "./icon-row";

const hidden = { includeHiddenElements: true };

// Follow-up 225 §3 and the system board's «05 · Filas con ícono».
describe("IconRow", () => {
  it("puts an 18 pt Palo de rosa glyph in a 36 pt Rosa tinte disc before a Work Sans 16 label", async () => {
    const screen = await render(
      <IconRow icon="calendar" label="30 días desde la fecha de inicio" />,
    );

    const label = screen.getByText("30 días desde la fecha de inicio");
    expect(label).toHaveStyle({
      color: "#4A4A4A",
      fontFamily: "WorkSans_400Regular",
      fontSize: 16,
    });
    expect(label.parent).toHaveStyle({
      alignItems: "center",
      flexDirection: "row",
      gap: 12,
      minHeight: 56,
      paddingHorizontal: 16,
    });
    expect(screen.getByTestId("icon-row-disc")).toHaveStyle({
      backgroundColor: "#F2E4E1",
      borderRadius: 18,
      height: 36,
      width: 36,
    });
    const glyph = screen.getByTestId("glyph-calendar", hidden);
    expect(glyph).toHaveProp("width", 18);
    expect(glyph).toHaveProp("stroke", "#B78380");
    expect(glyph).toHaveProp("strokeWidth", 1.5);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByTestId("chevron", hidden)).toBeNull();
  });

  it("shows a Texto tenue value and a chevron, and presses as one button", async () => {
    const onPress = jest.fn();
    const screen = await render(
      <IconRow chevron icon="bell" label="Notificaciones" onPress={onPress} value="Activadas" />,
    );

    expect(screen.getByText("Activadas")).toHaveStyle({ color: "#6F6662", fontSize: 15 });
    const chevron = screen.getByTestId("chevron", hidden);
    expect(chevron).toHaveProp("stroke", "#6F6662");
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
  it("draws Lino at radius 16 with no border and a hairline inset 64 between rows", async () => {
    const screen = await render(
      <IconRowGroup testID="group">
        <IconRow icon="calendar" label="Uno" />
        {null}
        <IconRow icon="clock" label="Dos" />
        <IconRow icon="pin" label="Tres" />
      </IconRowGroup>,
    );

    const group = screen.getByTestId("group");
    expect(group).toHaveStyle({ backgroundColor: "#F5EFE9", borderRadius: 16 });
    expect(StyleSheet.flatten(group.props.style)).not.toHaveProperty("borderWidth");
    const hairlines = screen.getAllByTestId("icon-row-hairline");
    expect(hairlines).toHaveLength(2);
    expect(hairlines[0]).toHaveStyle({ backgroundColor: "#E6DBD0", height: 1, marginLeft: 64 });
  });
});
