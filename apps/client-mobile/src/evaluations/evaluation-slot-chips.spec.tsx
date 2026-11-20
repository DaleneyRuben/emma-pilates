import { render, within } from "@testing-library/react-native";

import { EvaluationSlotPicker } from "./evaluation-slot-picker";

const slot = (id: string, date: string, time: string) => ({
  bookable: true,
  branchId: "branch-1",
  branchName: "Centro",
  durationMinutes: 45,
  endsAt: `${date}T${time}:45.000Z`,
  id,
  included: true,
  nutritionistName: "Gabriela Flores",
  priceCentavos: 0,
  startsAt: `${date}T${time}:00.000Z`,
});

// FIX-089 (palette B chips): the chosen day is Rosa profundo with Crema
// labels, the other days and the turnos Crema with an Arcilla outline.
describe("The Evaluation day and turno chips", () => {
  it("draws the chosen day solid and the rest outlined", async () => {
    const screen = await render(
      <EvaluationSlotPicker
        days={[
          { date: "2026-12-01", slots: [slot("slot-1", "2026-12-01", "13:00")] },
          { date: "2026-12-02", slots: [slot("slot-2", "2026-12-02", "14:00")] },
        ]}
        onPick={jest.fn()}
      />,
    );

    const [chosen, other] = screen
      .getAllByRole("button")
      .filter((button) => button.props.accessibilityState?.selected !== undefined);
    expect(chosen).toHaveStyle({ backgroundColor: "#93615D" });
    expect(within(chosen!).getByText("1")).toHaveStyle({ color: "#FFFBFB" });
    expect(other).toHaveStyle({ backgroundColor: "#FFFBFB", borderColor: "#CDA697" });
    expect(screen.getByRole("button", { name: /^Turno 09:00/ })).toHaveStyle({
      backgroundColor: "#FEF6F2",
      borderColor: "#CDA697",
      borderWidth: 1.5,
    });
  });
});
