import { fireEvent, render } from "@testing-library/react-native";

import { CancelledFold, ClassList, ClassRow, NextClassHero, placesLabel } from "../index";
import { Text } from "../ui/text";

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

    expect(screen.getByTestId("next-class-hero")).toHaveStyle({ backgroundColor: "#93615D" });
    expect(screen.getByText("08:00 · Mat Pilates")).toHaveStyle({
      color: "#FFFBFB",
      fontFamily: "Lora_500Medium",
      fontSize: 22,
    });
    // The eyebrow is upper case by its variant, never by `.toUpperCase()`.
    expect(screen.getByText("Próxima · en 40 min")).toHaveStyle({
      fontFamily: "WorkSans_700Bold",
      textTransform: "uppercase",
    });
    expect(screen.getByText("2 de 8")).toBeOnTheScreen();
    expect(screen.getByText("Achumani · Lucía y Elena")).toHaveStyle({ color: "#FFFBFB" });
    await fireEvent.press(screen.getByRole("button"));
    expect(onPress).toHaveBeenCalled();
  });
});

// «Propuestas actualizadas» (owner 2026-11-19): under the hero, who is coming
// as Crema circles with Rosa profundo initials, «+N» past five.
describe("NextClassHero attendees", () => {
  it("draws each attendee as a Crema initials circle", async () => {
    const screen = await render(
      <NextClassHero attendees={["LM", "SP"]} eyebrow="Próxima" title="08:00 · Mat Pilates" />,
    );

    const circles = screen.getAllByTestId("hero-attendee");
    expect(circles).toHaveLength(2);
    expect(circles[0]).toHaveStyle({ backgroundColor: "#FFFBFB" });
    expect(screen.getByText("LM")).toHaveStyle({ color: "#93615D" });
    expect(screen.getByTestId("next-class-hero").props.accessibilityLabel).toMatch(/Vienen 2 más$/);
  });

  it("keeps five circles and counts the rest as «+N»", async () => {
    const screen = await render(
      <NextClassHero
        attendees={["A", "B", "C", "D", "E", "F", "G"]}
        eyebrow="Próxima"
        title="08:00 · Mat Pilates"
      />,
    );

    expect(screen.getAllByTestId("hero-attendee")).toHaveLength(6);
    expect(screen.getByText("+2")).toBeOnTheScreen();
  });

  it("leaves the row out when nobody else is coming", async () => {
    const screen = await render(
      <NextClassHero attendees={[]} eyebrow="Próxima" title="08:00 · Mat Pilates" />,
    );

    expect(screen.queryByTestId("hero-attendees")).toBeNull();
  });
});

describe("ClassRow in a ClassList", () => {
  it("puts the type bar, the time in Lora, the class and branch, and the places at the end", async () => {
    const screen = await render(
      <ClassList>
        <ClassRow detail="Achumani" places="1 de 8" time="16:00" title="Reformer" />
        <ClassRow detail="Achumani" places="0 de 10" time="17:00" title="Mat Pilates" />
      </ClassList>,
    );

    expect(screen.getByTestId("class-list")).toHaveStyle({
      backgroundColor: "#FFFBFB",
      borderRadius: 20,
    });
    const bars = screen.getAllByTestId("type-bar");
    expect(bars[0]).toHaveStyle({ backgroundColor: "#93615D", width: 5 });
    expect(bars[1]).toHaveStyle({ backgroundColor: "#DAB9AB" });
    expect(screen.getByText("16:00")).toHaveStyle({ fontFamily: "Lora_500Medium", fontSize: 24 });
    expect(screen.getByText("1 de 8")).toHaveStyle({ fontFamily: "WorkSans_700Bold" });
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
        <Text variant="cuerpo">Reformer 19:00</Text>
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
        <Text variant="cuerpo">x</Text>
      </CancelledFold>,
    );
    expect(one.getByText("1 cancelada por mínimo")).toBeOnTheScreen();
    const none = await render(
      <CancelledFold count={0}>
        <Text variant="cuerpo">x</Text>
      </CancelledFold>,
    );
    expect(none.toJSON()).toBeNull();
  });
});

describe("ClassRow detail", () => {
  it("keeps a long detail on one line when asked", async () => {
    const screen = await render(
      <ClassRow detail="Achumani · Daniela Ortiz" detailLines={1} time="16:00" title="Reformer" />,
    );

    expect(screen.getByText("Achumani · Daniela Ortiz")).toHaveProp("numberOfLines", 1);
  });
});

describe("CancelledFold without a single reason", () => {
  it("says the count alone when the causes differ", async () => {
    const screen = await render(
      <CancelledFold count={2} reason="">
        <Text variant="cuerpo">x</Text>
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
