import { render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { Text } from "./text";

function styleOf(node: { props: { style?: unknown } }) {
  return StyleSheet.flatten(node.props.style as never);
}

describe("Text", () => {
  it("draws its variant in ink by default", async () => {
    const screen = await render(<Text variant="cuerpo">Tu clase está confirmada.</Text>);

    expect(styleOf(screen.getByText("Tu clase está confirmada."))).toEqual({
      color: "#93615D",
      fontFamily: "WorkSans_400Regular",
      fontSize: 15,
      lineHeight: 23,
    });
  });

  it("draws white on 600 with the onDark tone", async () => {
    const screen = await render(
      <Text tone="onDark" variant="titulo-bloque">
        Reformer
      </Text>,
    );

    expect(styleOf(screen.getByText("Reformer"))).toMatchObject({
      color: "#FFFBFB",
      fontFamily: "Lora_500Medium",
      fontSize: 22,
    });
  });

  it("caps the phone's text size at 1.3 and lets a caller lower it, never raise it", async () => {
    const screen = await render(
      <>
        <Text variant="cuerpo">Uno</Text>
        <Text maxFontSizeMultiplier={1.1} variant="cuerpo">
          Dos
        </Text>
        <Text maxFontSizeMultiplier={3} variant="cuerpo">
          Tres
        </Text>
      </>,
    );

    expect(screen.getByText("Uno")).toHaveProp("maxFontSizeMultiplier", 1.3);
    expect(screen.getByText("Dos")).toHaveProp("maxFontSizeMultiplier", 1.1);
    expect(screen.getByText("Tres")).toHaveProp("maxFontSizeMultiplier", 1.3);
  });

  it("keeps layout from the caller's style and strikes through on request", async () => {
    const screen = await render(
      <Text strike style={{ marginTop: 4, textAlign: "center" }} variant="secundario">
        Bs 450
      </Text>,
    );

    expect(styleOf(screen.getByText("Bs 450"))).toMatchObject({
      fontSize: 13,
      marginTop: 4,
      textAlign: "center",
      textDecorationLine: "line-through",
    });
  });

  it("refuses typography, colour and opacity in its style", () => {
    // Type-level checks: each line fails to compile without its directive.
    // @ts-expect-error fontSize belongs to the variant
    void (<Text style={{ fontSize: 18 }} variant="cuerpo" />);
    // @ts-expect-error fontFamily belongs to the variant
    void (<Text style={{ fontFamily: "Lora_400Regular" }} variant="cuerpo" />);
    // @ts-expect-error fontWeight belongs to the face file
    void (<Text style={{ fontWeight: "700" }} variant="cuerpo" />);
    // @ts-expect-error colour is the tone prop
    void (<Text style={{ color: "#000" }} variant="cuerpo" />);
    // @ts-expect-error text is never transparent (rule 5)
    void (<Text style={{ opacity: 0.5 }} variant="cuerpo" />);
    // @ts-expect-error line height comes with the variant (rule 9)
    void (<Text style={{ lineHeight: 30 }} variant="cuerpo" />);
    // @ts-expect-error capitals come only from etiqueta (rule 8)
    void (<Text style={{ textTransform: "uppercase" }} variant="cuerpo" />);
    // @ts-expect-error every text names its variant
    void (<Text>Sin variante</Text>);

    expect(true).toBe(true);
  });
});
