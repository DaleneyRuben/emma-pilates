import { render } from "@testing-library/react-native";

import { SectionTitle } from "./section-title";
import { textVariants } from "./type-scale";

// Rosa Emma (follow-up 284): a section heading sits on the 100 screen, so it
// takes titulo-seccion, which the background allows, 12 above its group.
describe("SectionTitle", () => {
  it("draws a titulo-seccion heading 12 above its group", async () => {
    const screen = await render(<SectionTitle>Qué incluye</SectionTitle>);

    const title = screen.getByText("Qué incluye");
    expect(title).toHaveStyle({
      ...textVariants["titulo-seccion"],
      color: "#93615D",
      marginBottom: 12,
    });
    expect(title).toHaveProp("accessibilityRole", "header");
  });
});
