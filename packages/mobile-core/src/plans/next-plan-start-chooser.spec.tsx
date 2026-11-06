import { fireEvent, render } from "@testing-library/react-native";

import { NextPlanStartChooser } from "./next-plan-start-chooser";
import { nextPlanStartOptions } from "./start-date-options";

// booking ADR-0013 and design follow-up 254 § 4: with a Plan in force, the
// next one picks a day from the day after the current end through 28 days
// after it, on the same «Fecha de inicio» strip as a first Plan.
describe("nextPlanStartOptions", () => {
  it("offers the 28 days after the current end, starting the day after", () => {
    const options = nextPlanStartOptions("2026-12-06");

    expect(options).toHaveLength(28);
    expect(options[0]?.date).toBe("2026-12-06");
    expect(options[27]?.date).toBe("2027-01-02");
  });
});

describe("NextPlanStartChooser", () => {
  it("names the current end, the chosen start and the last day", async () => {
    const screen = await render(
      <NextPlanStartChooser
        currentPlan="El plan actual de Rocío"
        firstDay="2026-12-06"
        onSelect={jest.fn()}
        selected="2026-12-10"
      />,
    );

    expect(screen.getByRole("header", { name: "Fecha de inicio" })).toBeOnTheScreen();
    expect(
      screen.getByText(
        "El plan actual de Rocío vence el 5 de diciembre. El nuevo empieza el 10 de diciembre; se puede elegir hasta el 2 de enero.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByTestId("start-date-2026-12-10")).toHaveProp("accessibilityState", {
      selected: true,
    });
  });

  it("picks another day", async () => {
    const onSelect = jest.fn();
    const screen = await render(
      <NextPlanStartChooser
        currentPlan="Tu plan actual"
        firstDay="2026-12-06"
        onSelect={onSelect}
        selected="2026-12-06"
      />,
    );

    await fireEvent.press(screen.getByTestId("start-date-2026-12-20"));

    expect(onSelect).toHaveBeenCalledWith("2026-12-20");
  });
});
