import { render } from "@testing-library/react-native";

import { NoticeRow } from "./notice-row";

const hidden = { includeHiddenElements: true };

// Follow-up 225 §7: an icon and one line instead of the amber block. FIX-089:
// the glyph stands alone and the card has an Arcilla border.
describe("NoticeRow", () => {
  it("draws the alert glyph alone and one line on a Crema card", async () => {
    const screen = await render(
      <NoticeRow
        message="Esto no se puede deshacer. La clase no tiene reservas."
        testID="notice"
      />,
    );

    expect(screen.getByTestId("notice")).toHaveStyle({
      alignItems: "center",
      backgroundColor: "#FEF6F2",
      borderColor: "#E7CCBF",
      borderRadius: 16,
      borderWidth: 1,
      flexDirection: "row",
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
    });
    expect(screen.queryByTestId("notice-row-disc", hidden)).toBeNull();
    const glyph = screen.getByTestId("glyph-alert", hidden);
    expect(glyph).toHaveProp("stroke", "#93615D");
    expect(glyph).toHaveProp("strokeWidth", 1.6);
    expect(glyph).toHaveProp("width", 20);
    expect(screen.getByText("Esto no se puede deshacer. La clase no tiene reservas.")).toHaveStyle({
      color: "#93615D",
      flex: 1,
      fontSize: 15,
    });
  });
});
