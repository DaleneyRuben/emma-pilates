import { render } from "@testing-library/react-native";

import { Chevron } from "./chevron";

const hidden = { includeHiddenElements: true };

// MOB-041: the frames end every tappable row in one 19 pt chevron: Palo de
// rosa on cards and lists (02, 16, S16), Icono tenue on the Perfil menus (18,
// S23), and a 16 pt Texto tenue one pointing down on the Branch picker.
describe("Chevron", () => {
  it("points right in Palo de rosa at 19 pt by default", async () => {
    const screen = await render(<Chevron />);

    const icon = screen.getByTestId("chevron", hidden);
    expect(icon).toHaveProp("stroke", "#B78380");
    expect(icon).toHaveProp("strokeWidth", 1.3);
    expect(icon).toHaveProp("width", 19);
    expect(icon).toHaveProp("height", 19);
    expect(screen.getByTestId("chevron-right", hidden)).toHaveProp("d", "M9.5 5 16.5 12 9.5 19");
  });

  it("takes the quiet tone of the Perfil menu rows", async () => {
    const screen = await render(<Chevron tone="quiet" />);

    expect(screen.getByTestId("chevron", hidden)).toHaveProp("stroke", "#C4BAB6");
  });

  it("points down or up in Texto tenue at 16 pt for the Branch picker", async () => {
    const screen = await render(
      <>
        <Chevron direction="down" size={16} testID="closed" tone="muted" />
        <Chevron direction="up" size={16} testID="open" tone="muted" />
      </>,
    );

    const closed = screen.getByTestId("closed", hidden);
    expect(closed).toHaveProp("stroke", "#766D69");
    expect(closed).toHaveProp("width", 16);
    expect(screen.getByTestId("closed-down", hidden)).toHaveProp("d", "M6 9.5 12 15.5 18 9.5");
    expect(screen.getByTestId("open-up", hidden)).toHaveProp("d", "M6 14.5 12 8.5 18 14.5");
  });

  it("stays hidden from screen readers", async () => {
    const screen = await render(<Chevron />);

    expect(screen.getByTestId("chevron", hidden)).toHaveProp("accessibilityElementsHidden", true);
  });
});
