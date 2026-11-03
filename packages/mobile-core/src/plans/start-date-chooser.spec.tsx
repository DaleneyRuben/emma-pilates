import { render } from "@testing-library/react-native";

import { StartDateChooser } from "./start-date-chooser";

// MOB-074 walk: Detalle del plan (C09) and Registrar pago (S10) draw «Fecha de
// inicio» once, as a section title over the day tiles; the client app added
// its own title over the chooser's small caption, so it read twice.
describe("StartDateChooser", () => {
  it("titles the day tiles once, as a section title", async () => {
    const screen = await render(
      <StartDateChooser
        onSelect={() => undefined}
        openingDate={null}
        selected="2026-11-02"
        startDateLimitDays={7}
        today="2026-11-02"
      />,
    );

    expect(screen.getAllByText("Fecha de inicio")).toHaveLength(1);
    expect(screen.getByRole("header", { name: "Fecha de inicio" })).toHaveStyle({
      textTransform: "uppercase",
    });
  });
});
