import { render } from "@testing-library/react-native";

import { SeatPill } from "./seat-pill";

// MOB-047, FIX-089: the places are a normal state, so plain bold text, never
// a pill; the words carry the state, never Error red or Éxito green.
describe("SeatPill", () => {
  it("says the seats that remain in Rosa profundo Work Sans 13 SemiBold", async () => {
    const screen = await render(<SeatPill>3 cupos</SeatPill>);

    expect(screen.getByTestId("seat-pill")).toHaveStyle({
      color: "#93615D",
      fontFamily: "WorkSans_600SemiBold",
      fontSize: 13,
    });
  });

  it("says a full class the same way", async () => {
    const screen = await render(<SeatPill full>Completa</SeatPill>);

    expect(screen.getByText("Completa")).toHaveStyle({ color: "#93615D", fontSize: 13 });
    expect(screen.getByTestId("seat-pill")).not.toHaveStyle({ borderRadius: 999 });
  });

  it("carries only its label, no dot", async () => {
    const screen = await render(<SeatPill full>Lleno</SeatPill>);

    expect(screen.getByTestId("seat-pill").children).toHaveLength(1);
  });
});
