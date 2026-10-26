import { render } from "@testing-library/react-native";

import { UnreadCountPill } from "./unread-count-pill";

// UX-020: the digits are a picture of the count. The tab and the row already
// speak it, so the pill itself is not a second stop for the reader.
describe("UnreadCountPill", () => {
  it("hides its digits from the screen reader", async () => {
    const screen = await render(<UnreadCountPill count={2} />);

    const digits = screen.getByText("2", { includeHiddenElements: true });
    expect(digits).toBeOnTheScreen();
    expect(digits.parent).toHaveProp("importantForAccessibility", "no-hide-descendants");
    expect(digits.parent).toHaveProp("accessibilityElementsHidden", true);
  });
});
