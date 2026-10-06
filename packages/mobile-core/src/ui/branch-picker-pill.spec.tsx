import { fireEvent, render } from "@testing-library/react-native";

import { BranchPickerPill } from "./branch-picker-pill";

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
      backgroundColor: "#FFFFFF",
      borderColor: "#D8C9BB",
      borderRadius: 999,
      borderWidth: 1,
      flexDirection: "row",
      gap: 10,
      minHeight: 44,
      paddingHorizontal: 16,
    });
    expect(screen.getByText("Sucursal:")).toHaveStyle({ color: "#4A4A4A", fontSize: 14 });
    expect(screen.getByText("Centro")).toHaveStyle({
      color: "#4A4A4A",
      fontSize: 14,
      fontWeight: "500",
    });
    const pin = screen.getByTestId("glyph-pin", hidden);
    expect(pin).toHaveProp("width", 17);
    expect(pin).toHaveProp("stroke", "#B78380");
    const chevron = screen.getByTestId("branch-picker-chevron", hidden);
    expect(chevron).toHaveProp("stroke", "#766D69");
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
