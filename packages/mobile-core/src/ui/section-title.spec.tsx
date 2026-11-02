import { render } from "@testing-library/react-native";

import { SectionTitle } from "./section-title";

// Follow-up 225 §3: a section title is Work Sans 500 12 at 0.12em, uppercase,
// Texto tenue, 12 above its group.
describe("SectionTitle", () => {
  it("draws the uppercase Texto tenue label 12 above its group", async () => {
    const screen = await render(<SectionTitle>Qué incluye</SectionTitle>);

    const title = screen.getByText("Qué incluye");
    expect(title).toHaveStyle({
      color: "#6F6662",
      fontFamily: "WorkSans_500Medium",
      fontSize: 12,
      fontWeight: "500",
      letterSpacing: 1.44,
      marginBottom: 12,
      textTransform: "uppercase",
    });
    expect(title).toHaveProp("accessibilityRole", "header");
  });
});
