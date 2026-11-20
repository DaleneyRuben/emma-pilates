import { render } from "@testing-library/react-native";

import { colors } from "../ui/tokens";
import { StartDateChooser, StartDateStrip } from "./start-date-chooser";
import { startDateOptions } from "./start-date-options";

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

  it("draws the days as Crema tiles with an Arcilla border (FIX-089)", async () => {
    const screen = await renderChooser();

    expect(screen.getByTestId("start-date-2026-11-03")).toHaveStyle({
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 12,
      borderWidth: 1,
      height: 72,
      minWidth: 52,
    });
    expect(screen.getByTestId("start-date-2026-11-02")).toHaveStyle({
      backgroundColor: colors.primary,
    });
    expect(screen.getByText("3")).toHaveStyle({ fontFamily: "Lora_400Regular", fontSize: 18 });
  });

  // Staff pick E3 C: Registrar pago titles the days «Empieza» and notes the
  // current Plan's end beside the title.
  it("takes another title and a note beside it", async () => {
    const screen = await render(
      <StartDateStrip
        aside="el actual vence el lun 8 feb"
        onSelect={jest.fn()}
        options={startDateOptions({
          today: "2026-11-02",
          startDateLimitDays: 3,
          openingDate: null,
        })}
        selected="2026-11-02"
        title="Empieza"
      />,
    );

    expect(screen.getByRole("header", { name: "Empieza" })).toBeOnTheScreen();
    expect(screen.queryByText("Fecha de inicio")).toBeNull();
    expect(screen.getByText("el actual vence el lun 8 feb")).toBeOnTheScreen();
  });
});
