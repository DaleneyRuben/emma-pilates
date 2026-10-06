import { render } from "@testing-library/react-native";

import { SeatPill } from "./seat-pill";

// MOB-047: follow-up 84's one seat-pill rule for 03, S02, S07, and S13. The
// number or word carries the state, so the pill takes no dot: seats remaining
// sit on Palo de rosa tinte in Palo de rosa oscuro, a full class on the
// neutral pill in Texto secundario, never Error red and never Éxito green.
describe("SeatPill", () => {
  it("draws the seats that remain on Palo de rosa tinte at 12 pt weight 500", async () => {
    const screen = await render(<SeatPill>3 cupos</SeatPill>);

    expect(screen.getByTestId("seat-pill")).toHaveStyle({
      backgroundColor: "#EFE0DC",
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
    });
    expect(screen.getByText("3 cupos")).toHaveStyle({
      color: "#7A4F4B",
      fontFamily: "WorkSans_500Medium",
      fontSize: 12,
      fontWeight: "500",
    });
  });

  it("draws a full class on the neutral pill in Texto secundario", async () => {
    const screen = await render(<SeatPill full>Completa</SeatPill>);

    expect(screen.getByTestId("seat-pill")).toHaveStyle({
      backgroundColor: "rgba(216,201,187,0.34)",
      borderRadius: 999,
    });
    expect(screen.getByText("Completa")).toHaveStyle({
      color: "#6E6663",
      fontSize: 12,
      fontWeight: "500",
    });
  });

  it("carries only its label, no dot", async () => {
    const screen = await render(<SeatPill full>Lleno</SeatPill>);

    expect(screen.getByTestId("seat-pill").children).toHaveLength(1);
  });
});
