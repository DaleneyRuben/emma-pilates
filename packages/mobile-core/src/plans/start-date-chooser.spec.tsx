import { render } from "@testing-library/react-native";

import { colors } from "../ui/tokens";
import { StartDateChooser } from "./start-date-chooser";

// C09 and S10 on v2: «Fecha de inicio» is the section title (once), and the
// days are 60-high Lino tiles with the day in Lora, the chosen one in Palo de
// rosa. The emulator showed the title twice and v1 bordered chips (MOB-074).
describe("StartDateChooser", () => {
  async function renderChooser() {
    return render(
      <StartDateChooser
        onSelect={jest.fn()}
        openingDate={null}
        selected="2026-11-02"
        startDateLimitDays={6}
        today="2026-11-02"
      />,
    );
  }

  it("names the choice once, as a section title", async () => {
    const screen = await renderChooser();

    expect(screen.getAllByText("Fecha de inicio")).toHaveLength(1);
    expect(screen.getByRole("header", { name: "Fecha de inicio" })).toBeOnTheScreen();
  });

  it("draws the days as v2 Lino tiles", async () => {
    const screen = await renderChooser();

    expect(screen.getByTestId("start-date-2026-11-03")).toHaveStyle({
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 0,
      height: 60,
      minWidth: 52,
    });
    expect(screen.getByTestId("start-date-2026-11-02")).toHaveStyle({
      backgroundColor: colors.primary,
    });
    expect(screen.getByText("3")).toHaveStyle({ fontFamily: "Lora_400Regular", fontSize: 18 });
  });
});
