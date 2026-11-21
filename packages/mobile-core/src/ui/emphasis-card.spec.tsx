import { fireEvent, render } from "@testing-library/react-native";

import { EmphasisCard, OnEmphasisButton } from "./emphasis-card";
import { Text } from "./text";
import { textVariants } from "./type-scale";

// Follow-up 225 §5 and the boards' Inicio and Detalle del Plan hero cards.
describe("EmphasisCard", () => {
  it("draws the 600 hero at radius 24 and padding 20 with white text", async () => {
    const onPress = jest.fn();
    const screen = await render(
      <EmphasisCard
        action={{ label: "Comprar un plan", onPress }}
        eyebrow="Tu plan · 12 clases"
        note="Mat y Reformer · paga por QR o en el estudio"
        pill="Desde Bs 80"
        testID="hero"
        title="Elige tu plan y empieza a moverte"
      />,
    );

    expect(screen.getByTestId("hero")).toHaveStyle({
      backgroundColor: "#93615D",
      borderRadius: 24,
      gap: 8,
      padding: 20,
    });
    // Follow-up 285: etiqueta, pastilla, titulo-bloque and cuerpo, all white.
    expect(screen.getByText("Tu plan · 12 clases")).toHaveStyle({
      ...textVariants.etiqueta,
      color: "#FFFBFB",
    });
    // FIX-089: a normal fact on the hero is white text, not a pill.
    expect(screen.getByText("Desde Bs 80")).toHaveStyle({
      ...textVariants.pastilla,
      color: "#FFFBFB",
    });
    expect(screen.getByText("Desde Bs 80").parent).not.toHaveStyle({ borderRadius: 999 });
    expect(screen.getByText("Elige tu plan y empieza a moverte")).toHaveStyle({
      ...textVariants["titulo-bloque"],
      color: "#FFFBFB",
    });
    expect(screen.getByText("Mat y Reformer · paga por QR o en el estudio")).toHaveStyle({
      ...textVariants.cuerpo,
      color: "#FFFBFB",
    });
    await fireEvent.press(screen.getByRole("button", { name: "Comprar un plan" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("holds custom content and leaves out what it is not given", async () => {
    const screen = await render(
      <EmphasisCard testID="hero">
        <Text tone="onDark" variant="cuerpo">
          9 clases restantes
        </Text>
      </EmphasisCard>,
    );

    expect(screen.getByText("9 clases restantes")).toBeOnTheScreen();
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("OnEmphasisButton", () => {
  it("is a 44 pt white pill with an ink boton label", async () => {
    const screen = await render(<OnEmphasisButton label="Comprar un plan" onPress={jest.fn()} />);

    expect(screen.getByRole("button", { name: "Comprar un plan" })).toHaveStyle({
      alignSelf: "flex-start",
      backgroundColor: "#FFFBFB",
      borderRadius: 999,
      minHeight: 44,
      paddingHorizontal: 20,
    });
    expect(screen.getByText("Comprar un plan")).toHaveStyle({
      ...textVariants.boton,
      color: "#93615D",
    });
  });
});
