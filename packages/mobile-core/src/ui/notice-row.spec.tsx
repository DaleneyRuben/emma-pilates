import { render } from "@testing-library/react-native";

import { NoticeRow } from "./notice-row";

const hidden = { includeHiddenElements: true };

// Follow-up 225 §7 as the system board draws «08 · Advertencia»: an icon and
// one line on Lino instead of the amber block.
describe("NoticeRow", () => {
  it("draws an Error alert in an #F7E5E0 disc and one line on Lino", async () => {
    const screen = await render(
      <NoticeRow
        message="Esto no se puede deshacer. La clase no tiene reservas."
        testID="notice"
      />,
    );

    expect(screen.getByTestId("notice")).toHaveStyle({
      alignItems: "center",
      backgroundColor: "#F5EFE9",
      borderRadius: 14,
      flexDirection: "row",
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
    });
    expect(screen.getByTestId("notice-row-disc")).toHaveStyle({
      backgroundColor: "#F7E5E0",
      borderRadius: 18,
      height: 36,
      width: 36,
    });
    const glyph = screen.getByTestId("glyph-alert", hidden);
    expect(glyph).toHaveProp("stroke", "#A04E3E");
    expect(glyph).toHaveProp("strokeWidth", 1.6);
    expect(glyph).toHaveProp("width", 18);
    expect(screen.getByText("Esto no se puede deshacer. La clase no tiene reservas.")).toHaveStyle({
      color: "#4A4A4A",
      flex: 1,
      fontSize: 15,
    });
  });
});
