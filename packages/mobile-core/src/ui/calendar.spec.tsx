import { fireEvent, render } from "@testing-library/react-native";

import { Calendar } from "./calendar";

// DES-015 (follow-up 259): the month calendar, Monday first, a range drawn
// from its first to its last day, off days still tappable so a screen can
// say why they are off.
describe("Calendar", () => {
  const base = {
    firstMonth: "2026-11",
    lastMonth: "2027-01",
    today: "2026-11-08",
    rangeStart: null,
    rangeEnd: null,
    isOff: (day: string) => day < "2026-11-08",
    onPressDay: jest.fn(),
  };

  it("draws the month Monday first and names each day", async () => {
    const screen = await render(<Calendar {...base} />);

    expect(screen.getByRole("header", { name: "Noviembre 2026" })).toBeOnTheScreen();
    // The weekday letters are visual only, hidden from screen readers.
    expect(screen.getAllByText("M", { includeHiddenElements: true })).toHaveLength(2);
    expect(screen.queryByText("M")).toBeNull();
    // 1 November 2026 is a Sunday: six blanks before it.
    expect(screen.getAllByTestId("calendar-blank")).toHaveLength(6);
    expect(screen.getByRole("button", { name: "dom 8 de noviembre, hoy" })).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "sáb 7 de noviembre, no disponible" }),
    ).toBeOnTheScreen();
  });

  it("reports a tap on any day, off days included", async () => {
    const onPressDay = jest.fn();
    const screen = await render(<Calendar {...base} onPressDay={onPressDay} />);

    await fireEvent.press(screen.getByRole("button", { name: "lun 16 de noviembre" }));
    await fireEvent.press(
      screen.getByRole("button", { name: "sáb 7 de noviembre, no disponible" }),
    );

    expect(onPressDay).toHaveBeenNthCalledWith(1, "2026-11-16");
    expect(onPressDay).toHaveBeenNthCalledWith(2, "2026-11-07");
  });

  it("marks the range and moves between the allowed months", async () => {
    const screen = await render(
      <Calendar {...base} rangeEnd="2026-11-22" rangeStart="2026-11-16" />,
    );

    expect(screen.getByRole("button", { name: "lun 16 de noviembre" })).toHaveProp(
      "accessibilityState",
      expect.objectContaining({ selected: true }),
    );
    expect(screen.getByRole("button", { name: "jue 19 de noviembre" })).toHaveProp(
      "accessibilityState",
      expect.objectContaining({ selected: true }),
    );
    expect(screen.getByRole("button", { name: "Mes anterior" })).toBeDisabled();

    await fireEvent.press(screen.getByRole("button", { name: "Mes siguiente" }));
    await fireEvent.press(screen.getByRole("button", { name: "Mes siguiente" }));
    expect(screen.getByRole("header", { name: "Enero 2027" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Mes siguiente" })).toBeDisabled();
  });
});
