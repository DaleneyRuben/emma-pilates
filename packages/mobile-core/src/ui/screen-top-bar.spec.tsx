import { fireEvent, render } from "@testing-library/react-native";

import { BackLink } from "../index";
import { colors } from "./tokens";

const hidden = { includeHiddenElements: true };

describe("BackLink above a large title (S03, S05–S10)", () => {
  it("draws the chevron, not «← Volver»", async () => {
    const onPress = jest.fn();
    const screen = await render(<BackLink onPress={onPress} />);

    expect(screen.queryByText("← Volver")).toBeNull();
    expect(screen.getByTestId("back-chevron", hidden)).toHaveProp("stroke", colors.text);
    await fireEvent.press(screen.getByRole("button", { name: "Volver" }));
    expect(onPress).toHaveBeenCalled();
  });
});
