import { fireEvent, render } from "@testing-library/react-native";
import { Text } from "react-native";

import { EmphasisCard, OnEmphasisButton } from "./emphasis-card";

// Follow-up 225 §5 and the boards' Inicio and Detalle del Plan hero cards.
describe("EmphasisCard", () => {
  it("draws the Palo de rosa hero at radius 18 and padding 20 with Crema text", async () => {
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
      backgroundColor: "#B78380",
      borderRadius: 18,
      gap: 12,
      padding: 20,
    });
    expect(screen.getByText("Tu plan · 12 clases")).toHaveStyle({
      color: "#F9F4F2",
      fontSize: 12,
      textTransform: "uppercase",
    });
    expect(screen.getByText("Desde Bs 80")).toHaveStyle({ color: "#93615D", fontSize: 13 });
    expect(screen.getByText("Desde Bs 80").parent).toHaveStyle({
      alignSelf: "flex-start",
      backgroundColor: "#E7CCBF",
      borderRadius: 999,
    });
    expect(screen.getByText("Elige tu plan y empieza a moverte")).toHaveStyle({
      color: "#F9F4F2",
      fontFamily: "Lora_400Regular",
      fontSize: 24,
    });
    expect(screen.getByText("Mat y Reformer · paga por QR o en el estudio")).toHaveStyle({
      color: "#F9F4F2",
    });
    await fireEvent.press(screen.getByRole("button", { name: "Comprar un plan" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("holds custom content and leaves out what it is not given", async () => {
    const screen = await render(
      <EmphasisCard testID="hero">
        <Text>9 clases restantes</Text>
      </EmphasisCard>,
    );

    expect(screen.getByText("9 clases restantes")).toBeOnTheScreen();
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("OnEmphasisButton", () => {
  it("is a 44 pt Crema pill with a Rosa profundo Work Sans 600 label", async () => {
    const screen = await render(<OnEmphasisButton label="Comprar un plan" onPress={jest.fn()} />);

    expect(screen.getByRole("button", { name: "Comprar un plan" })).toHaveStyle({
      alignSelf: "flex-start",
      backgroundColor: "#F9F4F2",
      borderRadius: 999,
      minHeight: 44,
      paddingHorizontal: 20,
    });
    expect(screen.getByText("Comprar un plan")).toHaveStyle({
      color: "#93615D",
      fontFamily: "WorkSans_600SemiBold",
      fontSize: 15,
    });
  });
});
