import { render } from "@testing-library/react-native";

import { PrimaryButton } from "../ui/primary-button";
import { colors } from "../ui/tokens";
import { WaitNotice } from "./auth-parts";

const notice = (surface?: "card") =>
  render(
    <WaitNotice
      message="Ya enviamos un correo a esa dirección hace poco. El enlace vigente sigue sirviendo."
      remainingSeconds={40}
      surface={surface}
      waitLabel="Podrás reenviarlo en"
    />,
  );

describe("WaitNotice inside a pending card (S06 «Reenvío limitado», «Verificación limitada»)", () => {
  it("draws the soft 50 inset with its 200 rule by default (C01t, C20l)", async () => {
    const screen = await notice();

    expect(screen.getByTestId("wait-notice")).toHaveStyle({
      backgroundColor: colors.secondaryTint,
      borderColor: "#E7CCBF",
      borderRadius: 16,
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 14,
    });
  });

  it("draws a white bordered box with the tighter padding on the card's tint", async () => {
    const screen = await notice("card");

    expect(screen.getByTestId("wait-notice")).toHaveStyle({
      backgroundColor: colors.card,
      borderColor: colors.borderStrong,
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
    });
    expect(screen.getByText("Podrás reenviarlo en 0:40.")).toBeOnTheScreen();
  });
});

describe("PrimaryButton in a card (S06's «Enviar enlace de verificación»)", () => {
  it("is 48 pt tall when compact and 52 pt otherwise", async () => {
    const screen = await render(
      <>
        <PrimaryButton label="Grande" />
        <PrimaryButton label="Compacto" size="compact" />
      </>,
    );

    expect(screen.getByRole("button", { name: "Grande" })).toHaveStyle({ minHeight: 52 });
    expect(screen.getByRole("button", { name: "Compacto" })).toHaveStyle({ minHeight: 48 });
  });
});
