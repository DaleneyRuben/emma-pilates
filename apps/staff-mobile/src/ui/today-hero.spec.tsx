import { fireEvent, render } from "@testing-library/react-native";

import { splitNextClass } from "../trainer/next-class";
import { TodayHero } from "./today-hero";

const now = new Date("2026-11-19T15:11:00.000Z"); // 11:11 in La Paz
const at = (time: string) => `2026-11-19T${time}:00.000-04:00`;
const classes = [
  { id: "a", startsAt: at("08:00") },
  { id: "b", startsAt: at("16:00") },
  { id: "c", startsAt: at("17:00") },
];

// FIX-089 (ClaseE): today's next class leads every class list as the hero.
describe("splitNextClass", () => {
  it("takes today's first class that has not started", () => {
    expect(splitNextClass(classes, true, now)).toEqual({
      next: classes[1],
      rest: [classes[0], classes[2]],
    });
  });

  it("keeps rows only on another day or once every class has started", () => {
    expect(splitNextClass(classes, false, now)).toEqual({ next: undefined, rest: classes });
    const late = new Date("2026-11-19T23:00:00.000Z");
    expect(splitNextClass(classes, true, late)).toEqual({ next: undefined, rest: classes });
  });
});

describe("TodayHero", () => {
  it("draws the next class as the Palo de rosa hero under the row's own test id", async () => {
    const onPress = jest.fn();
    const screen = await render(
      <TodayHero
        detail="Achumani · Daniela Ortiz"
        now={now}
        onPress={onPress}
        places="2 de 8"
        startsAt={at("12:00")}
        testID="schedule-session-b"
        title="12:00 · Mat Pilates"
      />,
    );

    expect(screen.getByTestId("next-class-hero")).toBeOnTheScreen();
    expect(screen.getByText("Próxima · en 49 min")).toBeOnTheScreen();
    expect(screen.getByText("12:00 · Mat Pilates")).toHaveStyle({ color: "#FFFBFB" });
    await fireEvent.press(screen.getByTestId("schedule-session-b"));
    expect(onPress).toHaveBeenCalled();
  });

  it("shows who is coming by initials under the class (E7)", async () => {
    const screen = await render(
      <TodayHero
        attendees={["LF", "EP", "MP"]}
        now={now}
        places="3 de 8"
        startsAt={at("12:00")}
        testID="today-session-b"
        title="12:00 · Mat Pilates"
      />,
    );

    expect(screen.getAllByTestId("hero-attendee")).toHaveLength(3);
    expect(screen.getByText("EP")).toBeOnTheScreen();
    expect(screen.getByLabelText(/Vienen 3 más/)).toBeOnTheScreen();
  });
});
