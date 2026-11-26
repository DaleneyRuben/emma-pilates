import { render } from "@testing-library/react-native";

import { AvatarCircle } from "./avatar-circle";
import { CardFooter } from "./card-footer";
import { textVariants } from "./type-scale";
import { Text } from "./text";

// MOB-042: the pieces the frames' tappable cards share.
describe("CardFooter", () => {
  it("draws a row under a Regla rule, 12 pt below it by default", async () => {
    const screen = await render(
      <CardFooter>
        <Text variant="cuerpo">left</Text>
        <Text variant="cuerpo">right</Text>
      </CardFooter>,
    );

    expect(screen.getByTestId("card-footer")).toHaveStyle({
      alignItems: "center",
      borderTopColor: "#E7CCBF",
      borderTopWidth: 1,
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between",
      paddingTop: 12,
    });
  });

  it("takes the 13 pt the S02, S11, and S13 frames draw", async () => {
    const screen = await render(
      <CardFooter paddingTop={13}>
        <Text variant="cuerpo">left</Text>
      </CardFooter>,
    );

    expect(screen.getByTestId("card-footer")).toHaveStyle({ paddingTop: 13 });
  });
});

describe("AvatarCircle", () => {
  it("draws the initials on the 50 wash, pastilla under 44 pt", async () => {
    const screen = await render(<AvatarCircle name="valeria áñez" size={42} />);

    const letter = screen.getByText("VÁ");
    expect(letter).toHaveStyle({ ...textVariants.pastilla, color: "#93615D" });
    // The disc is fixed, so its initials never grow with the phone's text size.
    expect(letter).toHaveProp("allowFontScaling", false);
    expect(screen.getByTestId("avatar-circle")).toHaveStyle({
      backgroundColor: "#FEF6F2",
      borderRadius: 21,
      height: 42,
      width: 42,
    });
  });
});

describe("AvatarCircle at 44 pt and over", () => {
  it("draws the letter in destacado", async () => {
    const screen = await render(<AvatarCircle name="Lucía" size={56} />);

    expect(screen.getByText("L")).toHaveStyle(textVariants.destacado);
  });
});
