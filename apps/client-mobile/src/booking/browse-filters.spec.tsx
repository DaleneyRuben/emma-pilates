import { render } from "@testing-library/react-native";

import { DayStrip } from "./browse-filters";

const dates = [
  "2026-11-02",
  "2026-11-03",
  "2026-11-04",
  "2026-11-05",
  "2026-11-06",
  "2026-11-07",
  "2026-11-08",
];

// Seven 48-wide tiles and their gaps outgrow a 411-wide Android phone, so the
// last tile was clipped (MOB-074 on the emulator): they share the width now.
describe("Client day strip", () => {
  it("lets the seven days share the width instead of scrolling past the edge", async () => {
    const screen = await render(
      <DayStrip dates={dates} onSelect={jest.fn()} selected="2026-11-02" today="2026-11-02" />,
    );

    const strip = screen.getByTestId("browse-day-strip");
    expect(strip.props.horizontal).toBeUndefined();
    expect(strip).toHaveStyle({ flexDirection: "row", flexGrow: 0, flexShrink: 0 });
    for (const date of dates) {
      expect(screen.getByTestId(`browse-day-${date}`)).toHaveStyle({ flex: 1, minWidth: 0 });
    }
  });
});
