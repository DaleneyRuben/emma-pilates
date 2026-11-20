import { fireEvent, render } from "@testing-library/react-native";

import { BranchPickerPill } from "./branch-picker-pill";
import { textVariants } from "./type-scale";

const hidden = { includeHiddenElements: true };

// MOB-042: the «Sucursal:» picker of 03, S07, and S13 is one 44 pt pill with
// a pin, the Branch name at weight 500, and the 16 pt Texto tenue chevron.
describe("BranchPickerPill", () => {
  it("draws the pill with the pin, the name, and the chevron pointing down", async () => {
    const onPress = jest.fn();
    const screen = await render(<BranchPickerPill name="Centro" onPress={onPress} open={false} />);

    const pill = screen.getByRole("button", { name: "Sucursal: Centro" });
    expect(pill).toHaveStyle({
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: "#FFFBFB",
      borderRadius: 999,
      flexDirection: "row",
      gap: 10,
      minHeight: 44,
      paddingHorizontal: 16,
    });
    // Board C03: «Sucursal: Achumani» in `compacto` 14/400, one line.
    expect(screen.getByText("Sucursal: Centro")).toHaveStyle({
      ...textVariants.compacto,
      color: "#93615D",
    });
    const pin = screen.getByTestId("glyph-pin", hidden);
    expect(pin).toHaveProp("width", 17);
    expect(pin).toHaveProp("stroke", "#93615D");
    const chevron = screen.getByTestId("branch-picker-chevron", hidden);
    expect(chevron).toHaveProp("stroke", "#93615D");
    expect(chevron).toHaveProp("width", 16);
    expect(screen.getByTestId("branch-picker-chevron-down", hidden)).toBeOnTheScreen();

    fireEvent.press(pill);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("turns the chevron up while the picker is open", async () => {
    const screen = await render(<BranchPickerPill name="Centro" onPress={jest.fn()} open />);

    expect(screen.getByTestId("branch-picker-chevron-up", hidden)).toBeOnTheScreen();
  });
});
