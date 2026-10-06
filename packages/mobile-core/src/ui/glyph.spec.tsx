import { render } from "@testing-library/react-native";

import { Glyph } from "./glyph";

const hidden = { includeHiddenElements: true };

// MOB-042: the frames draw their small line icons on one 24-unit grid
// (02's shortcut tiles, the Trainer and Branch lines of 03, S02, S07, and
// S13, the picker pin), so one glyph primitive holds every shape.
describe("Glyph", () => {
  it("draws a named shape in Palo de rosa at stroke 1.3 by default", async () => {
    const screen = await render(<Glyph name="calendar" size={22} />);

    const icon = screen.getByTestId("glyph-calendar", hidden);
    expect(icon).toHaveProp("stroke", "#B78380");
    expect(icon).toHaveProp("strokeWidth", 1.3);
    expect(icon).toHaveProp("width", 22);
    expect(icon).toHaveProp("height", 22);
    expect(icon).toHaveProp("accessibilityElementsHidden", true);
  });

  it("takes another colour and stroke for the disabled tile and the empty states", async () => {
    const screen = await render(
      <Glyph color="#B3A9A5" name="calendar" size={22} strokeWidth={1.1} testID="tile" />,
    );

    const icon = screen.getByTestId("tile", hidden);
    expect(icon).toHaveProp("stroke", "#B3A9A5");
    expect(icon).toHaveProp("strokeWidth", 1.1);
  });

  it("knows the pin, person, trend, and lock shapes the rows use", async () => {
    const screen = await render(
      <>
        <Glyph name="pin" size={17} />
        <Glyph name="person" size={17} />
        <Glyph name="trend" size={22} />
        <Glyph name="lock" size={19} />
      </>,
    );

    for (const name of ["pin", "person", "trend", "lock"]) {
      expect(screen.getByTestId(`glyph-${name}`, hidden)).toBeOnTheScreen();
    }
  });
});
