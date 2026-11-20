import { render } from "@testing-library/react-native";

import { SectionTitle } from "./section-title";

// Rosa Emma (follow-up 284): a section heading sits on the 100 screen, so it
// takes the Lora 24 that the background allows, 12 above its group.
describe("SectionTitle", () => {
  it("draws a Lora 24 heading 12 above its group", async () => {
    const screen = await render(<SectionTitle>Qué incluye</SectionTitle>);

    const title = screen.getByText("Qué incluye");
    expect(title).toHaveStyle({
      color: "#93615D",
      fontFamily: "Lora_400Regular",
      fontSize: 24,
      marginBottom: 12,
    });
    expect(title).toHaveProp("accessibilityRole", "header");
  });
});
