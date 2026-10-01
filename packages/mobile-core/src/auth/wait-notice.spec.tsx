import { render } from "@testing-library/react-native";

import { colors } from "../ui/tokens";
import { WaitNotice } from "./auth-parts";

describe("WaitNotice (01, 20, S01, S18 limit frames)", () => {
  it("draws the Palo de rosa clock before the message, hidden from screen readers", async () => {
    const screen = await render(
      <WaitNotice
        message="Demasiadas solicitudes. Intenta de nuevo en un momento."
        remainingSeconds={52}
        waitLabel="Podrás pedirlo en"
      />,
    );

    const clock = screen.getByTestId("wait-notice-clock", {
      includeHiddenElements: true,
    });
    expect(clock).toHaveProp("width", 18);
    expect(clock).toHaveProp("height", 18);
    expect(clock).toHaveProp("stroke", colors.primary);
    expect(clock).toHaveProp("strokeWidth", 1.4);
    expect(screen.queryByTestId("wait-notice-clock")).toBeNull();
    expect(
      screen.getByRole("alert", {
        name: "Demasiadas solicitudes. Intenta de nuevo en un momento.",
      }),
    ).toBeOnTheScreen();
    expect(screen.getByText("Podrás pedirlo en 0:52.")).toBeOnTheScreen();
  });
});
