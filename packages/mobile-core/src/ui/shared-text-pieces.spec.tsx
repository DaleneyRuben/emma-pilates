import { render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { InlineError } from "./inline-error";
import { SheetTitle } from "./sheet-title";
import { TabLabel } from "./tab-label";

function styleOf(node: { props: { style?: unknown } }) {
  return StyleSheet.flatten(node.props.style as never);
}

describe("shared text pieces (follow-up 285)", () => {
  it("draws the open tab white and the others ink, in the same weight", async () => {
    const screen = await render(
      <>
        <TabLabel focused>Inicio</TabLabel>
        <TabLabel focused={false}>Reservas</TabLabel>
      </>,
    );
    const open = styleOf(screen.getByText("Inicio"));
    const closed = styleOf(screen.getByText("Reservas"));

    expect(open).toMatchObject({ color: "#FFFBFB", fontFamily: "WorkSans_700Bold", fontSize: 12 });
    expect(closed).toMatchObject({
      color: "#93615D",
      fontFamily: "WorkSans_700Bold",
      fontSize: 12,
    });
    expect(screen.getByText("Reservas")).not.toHaveProp("adjustsFontSizeToFit", true);
  });

  it("titles a sheet in titulo-seccion as a header", async () => {
    const screen = await render(<SheetTitle>Elegir otra fecha</SheetTitle>);

    expect(styleOf(screen.getByRole("header", { name: "Elegir otra fecha" }))).toMatchObject({
      fontFamily: "Lora_500Medium",
      fontSize: 24,
    });
  });

  it("says a request's error in cuerpo and a field's in secundario, as alerts", async () => {
    const screen = await render(
      <>
        <InlineError>No pudimos guardar tu teléfono.</InlineError>
        <InlineError field>Escribe un teléfono válido.</InlineError>
      </>,
    );
    const [request, field] = screen.getAllByRole("alert");

    expect(styleOf(request!)).toMatchObject({ fontFamily: "WorkSans_400Regular", fontSize: 15 });
    expect(styleOf(field!)).toMatchObject({ fontFamily: "WorkSans_400Regular", fontSize: 13 });
  });
});
