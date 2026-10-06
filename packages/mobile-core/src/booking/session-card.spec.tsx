import { fireEvent, render } from "@testing-library/react-native";
import { Text } from "react-native";

import { SessionCard } from "./session-card";

const hidden = { includeHiddenElements: true };

// MOB-042: 03 and S07 draw the same Session card: a spaced 12 pt time over
// a Lora 19 title with the seat pill on the right, then a footer under a
// rule with the Trainer after a person icon and the chevron on the right.
describe("SessionCard", () => {
  it("draws the time, the Lora title, the tag, the Trainer line, and the chevron", async () => {
    const onPress = jest.fn();
    const screen = await render(
      <SessionCard
        accessibilityLabel="Reformer Pilates 07:00 – 07:50"
        onPress={onPress}
        tag={<Text>3 cupos</Text>}
        time="07:00 – 07:50"
        title="Reformer Pilates"
        trainerName="Emma Vargas"
      />,
    );

    const card = screen.getByRole("button", { name: "Reformer Pilates 07:00 – 07:50" });
    expect(card).toHaveStyle({
      backgroundColor: "#FFFFFF",
      borderColor: "#D8C9BB",
      borderRadius: 16,
      borderWidth: 1,
      gap: 12,
      padding: 18,
    });
    expect(screen.getByText("07:00 – 07:50")).toHaveStyle({
      color: "#766D69",
      fontSize: 12,
      fontVariant: ["tabular-nums"],
      fontWeight: "500",
      letterSpacing: 1.2,
    });
    expect(screen.getByText("Reformer Pilates")).toHaveStyle({
      color: "#4A4A4A",
      fontFamily: "Lora_500Medium",
      fontSize: 19,
    });
    expect(screen.getByText("3 cupos")).toBeOnTheScreen();
    expect(screen.getByText("Emma Vargas")).toHaveStyle({ color: "#6E6663", fontSize: 14 });
    expect(screen.getByTestId("glyph-person", hidden)).toHaveProp("width", 17);
    const footer = screen.getByTestId("card-footer");
    expect(footer).toHaveStyle({ borderTopColor: "#EFE7DE", paddingTop: 12 });
    const chevron = screen.getByTestId("chevron", hidden);
    expect(chevron).toHaveProp("stroke", "#B78380");
    expect(chevron).toHaveProp("width", 19);

    fireEvent.press(card);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
