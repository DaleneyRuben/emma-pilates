import { render } from "@testing-library/react-native";

import { colors } from "../ui/tokens";
import { StartDateChooser } from "./start-date-chooser";

// C09 (Detalle del plan) and S10 (Registrar pago) on v2: «Fecha de inicio» is
// the section title, once, and the days are 60-high Lino tiles with the day in
// Lora, the chosen one in Palo de rosa. The MOB-074 walk read the title twice
// (the client app's own title over the chooser's caption) on v1 bordered chips.
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
    expect(screen.getByRole("header", { name: "Fecha de inicio" })).toHaveStyle({
      textTransform: "uppercase",
    });
  });

  it("draws the days as v2 Lino tiles", async () => {
    const screen = await renderChooser();

    expect(screen.getByTestId("start-date-2026-11-03")).toHaveStyle({
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 0,
      height: 72,
      minWidth: 52,
    });
    expect(screen.getByTestId("start-date-2026-11-02")).toHaveStyle({
      backgroundColor: colors.primary,
    });
    expect(screen.getByText("3")).toHaveStyle({ fontFamily: "Lora_400Regular", fontSize: 18 });
  });
});
