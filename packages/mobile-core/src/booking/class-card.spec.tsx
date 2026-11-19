import { fireEvent, render } from "@testing-library/react-native";
import { Text } from "react-native";

import { CancelledFold, ClassList, ClassRow, NextClassHero, placesLabel } from "../index";

// FIX-089 (ClaseE, owner 2026-11-19): one class card for every list of classes.
describe("NextClassHero", () => {
  it("draws the next class on Palo de rosa with large Crema Lora", async () => {
    const onPress = jest.fn();
    const screen = await render(
      <NextClassHero
        detail="Achumani · Lucía y Elena"
        eyebrow="Próxima · en 40 min"
        onPress={onPress}
        places="2 de 8"
        title="08:00 · Mat Pilates"
      />,
    );

    expect(screen.getByTestId("next-class-hero")).toHaveStyle({ backgroundColor: "#B78380" });
    expect(screen.getByText("08:00 · Mat Pilates")).toHaveStyle({
      color: "#F9F4F2",
      fontFamily: "Lora_400Regular",
      fontSize: 26,
    });
    expect(screen.getByText("PRÓXIMA · EN 40 MIN")).toHaveStyle({ fontWeight: "700" });
    expect(screen.getByText("2 de 8")).toBeOnTheScreen();
    expect(screen.getByText("Achumani · Lucía y Elena")).toHaveStyle({ color: "#F9F4F2" });
    await fireEvent.press(screen.getByRole("button"));
    expect(onPress).toHaveBeenCalled();
  });
});

describe("ClassRow in a ClassList", () => {
  it("puts the time in a Rubor box, the class and branch, and the places at the end", async () => {
    const screen = await render(
      <ClassList>
        <ClassRow detail="Achumani" places="1 de 8" time="16:00" title="Reformer" />
        <ClassRow detail="Achumani" places="0 de 10" time="17:00" title="Mat Pilates" />
      </ClassList>,
    );

    expect(screen.getByTestId("class-list")).toHaveStyle({
      backgroundColor: "#F9F4F2",
      borderColor: "#CDA697",
      borderWidth: 1,
    });
    expect(screen.getAllByTestId("class-row-time")[0]).toHaveStyle({
      backgroundColor: "#E7CCBF",
      borderRadius: 10,
    });
    expect(screen.getByText("16:00")).toHaveStyle({ fontWeight: "700" });
    expect(screen.getByText("1 de 8")).toHaveStyle({ fontWeight: "600" });
    expect(screen.getAllByTestId("class-list-divider")).toHaveLength(1);
  });

  it("is one button for a screen reader when it opens something", async () => {
    const onPress = jest.fn();
    const screen = await render(
      <ClassRow
        detail="Achumani"
        onPress={onPress}
        places="1 de 8"
        time="16:00"
        title="Reformer"
      />,
    );

    await fireEvent.press(
      screen.getByRole("button", { name: "16:00, Reformer, Achumani, 1 de 8" }),
    );
    expect(onPress).toHaveBeenCalled();
  });
});

describe("CancelledFold", () => {
  it("folds cancelled classes into one line that opens them", async () => {
    const screen = await render(
      <CancelledFold count={3}>
        <Text>Reformer 19:00</Text>
      </CancelledFold>,
    );

    expect(screen.getByText("3 canceladas por mínimo")).toBeOnTheScreen();
    expect(screen.queryByText("Reformer 19:00")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "3 canceladas por mínimo, Ver" }));
    expect(screen.getByText("Reformer 19:00")).toBeOnTheScreen();
  });

  it("speaks in the singular and draws nothing without cancellations", async () => {
    const one = await render(
      <CancelledFold count={1}>
        <Text>x</Text>
      </CancelledFold>,
    );
    expect(one.getByText("1 cancelada por mínimo")).toBeOnTheScreen();
    const none = await render(
      <CancelledFold count={0}>
        <Text>x</Text>
      </CancelledFold>,
    );
    expect(none.toJSON()).toBeNull();
  });
});

describe("CancelledFold without a single reason", () => {
  it("says the count alone when the causes differ", async () => {
    const screen = await render(
      <CancelledFold count={2} reason="">
        <Text>x</Text>
      </CancelledFold>,
    );

    expect(screen.getByRole("button", { name: "2 canceladas, Ver" })).toBeOnTheScreen();
  });
});

describe("placesLabel", () => {
  it("says the places as «N de M»", () => {
    expect(placesLabel(2, 8)).toBe("2 de 8");
  });
});
