import { render } from "@testing-library/react-native";
import { Text } from "react-native";

import { AvatarCircle } from "./avatar-circle";
import { CardFooter } from "./card-footer";
import { DetailLine } from "./detail-line";

const hidden = { includeHiddenElements: true };

// MOB-042: the pieces the frames' tappable cards share.
describe("DetailLine", () => {
  it("puts a glyph before a short line of text, 8 pt apart", async () => {
    const screen = await render(
      <DetailLine icon="person" iconSize={17} style={{ color: "#6E6663", fontSize: 14 }}>
        Emma Vargas
      </DetailLine>,
    );

    const text = screen.getByText("Emma Vargas");
    expect(text).toHaveStyle({ color: "#6E6663", fontSize: 14 });
    expect(text.parent).toHaveStyle({ alignItems: "center", flexDirection: "row", gap: 8 });
    const icon = screen.getByTestId("glyph-person", hidden);
    expect(icon).toHaveProp("width", 17);
    expect(icon).toHaveProp("stroke", "#B78380");
  });
});

describe("CardFooter", () => {
  it("draws a row under a Regla rule, 12 pt below it by default", async () => {
    const screen = await render(
      <CardFooter>
        <Text>left</Text>
        <Text>right</Text>
      </CardFooter>,
    );

    expect(screen.getByTestId("card-footer")).toHaveStyle({
      alignItems: "center",
      borderTopColor: "#EFE7DE",
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
        <Text>left</Text>
      </CardFooter>,
    );

    expect(screen.getByTestId("card-footer")).toHaveStyle({ paddingTop: 13 });
  });
});

describe("AvatarCircle", () => {
  it("draws the first letter in Lora on the accent wash", async () => {
    const screen = await render(<AvatarCircle fontSize={16} name="valeria áñez" size={42} />);

    const letter = screen.getByText("V");
    expect(letter).toHaveStyle({ color: "#8A5D59", fontFamily: "Lora_400Regular", fontSize: 16 });
    expect(screen.getByTestId("avatar-circle")).toHaveStyle({
      backgroundColor: "rgba(216,189,184,0.4)",
      borderRadius: 21,
      height: 42,
      width: 42,
    });
  });
});
