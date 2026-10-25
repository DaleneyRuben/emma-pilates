import {
  boliviaCivilDate,
  civilDateRange,
  agendaDayChipLabel,
  dayChipLabel,
  formatMonthHeading,
  formatSessionDate,
  formatTimeRange,
  hasStarted,
  isInsideCancellationWindow,
  upcomingCivilDates,
} from "./session-format";

describe("Session formatting", () => {
  it("treats the configured minutes before a Session as the Cancellation Window", () => {
    const now = new Date("2026-09-21T12:00:00.000Z");

    expect(isInsideCancellationWindow("2026-09-21T14:30:00.000Z", now, 150)).toBe(true);
    expect(isInsideCancellationWindow("2026-09-21T14:30:00.001Z", now, 150)).toBe(false);
    expect(isInsideCancellationWindow("2026-09-21T11:00:00.000Z", now, 150)).toBe(true);
  });

  // BKM-004: the window is a Studio Setting, so changing it moves the edge.
  it("follows a changed Cancellation Window", () => {
    const now = new Date("2026-09-21T12:00:00.000Z");

    expect(isInsideCancellationWindow("2026-09-21T15:00:00.000Z", now, 150)).toBe(false);
    expect(isInsideCancellationWindow("2026-09-21T15:00:00.000Z", now, 240)).toBe(true);
  });

  // MOB-044: a Session that has started can no longer be booked or cancelled.
  it("tells a started Session from an upcoming one", () => {
    const now = new Date("2026-09-21T12:00:00.000Z");
    expect(hasStarted("2026-09-21T12:00:00.000Z", now)).toBe(true);
    expect(hasStarted("2026-09-21T11:00:00.000Z", now)).toBe(true);
    expect(hasStarted("2026-09-21T12:00:00.001Z", now)).toBe(false);
  });

  it("derives the Bolivia civil date from an instant", () => {
    expect(boliviaCivilDate(new Date("2026-09-21T03:30:00.000Z"))).toBe("2026-09-20");
    expect(boliviaCivilDate(new Date("2026-09-21T04:00:00.000Z"))).toBe("2026-09-21");
  });

  it("lists the next seven civil dates starting today", () => {
    const dates = upcomingCivilDates("2026-09-28", 7);

    expect(dates).toHaveLength(7);
    expect(dates[0]).toBe("2026-09-28");
    expect(dates[3]).toBe("2026-10-01");
  });

  it("labels day chips with the Spanish weekday and day number", () => {
    expect(dayChipLabel("2026-09-21")).toEqual({ weekday: "lun", day: "21" });
    expect(dayChipLabel("2026-09-27")).toEqual({ weekday: "dom", day: "27" });
  });

  it("labels a civil date as S02 writes a day chip", () => {
    expect(agendaDayChipLabel("2026-10-21")).toEqual({ weekday: "Mié", day: "21" });
    expect(agendaDayChipLabel("2026-10-24")).toEqual({ weekday: "Sáb", day: "24" });
    expect(agendaDayChipLabel("2026-10-25")).toEqual({ weekday: "Dom", day: "25" });
    expect(agendaDayChipLabel("2026-10-19")).toEqual({ weekday: "Lun", day: "19" });
  });

  it("converts a civil date into the instant range the API expects", () => {
    expect(civilDateRange("2026-09-21")).toEqual({
      from: "2026-09-21T04:00:00.000Z",
      until: "2026-09-22T04:00:00.000Z",
    });
  });

  it("labels history months in capitalized Spanish", () => {
    expect(formatMonthHeading("2026-09-05T13:00:00.000Z")).toBe("Septiembre 2026");
    expect(formatMonthHeading("2026-08-19T11:00:00.000Z")).toBe("Agosto 2026");
  });

  it("formats Bolivia time ranges and long dates", () => {
    expect(formatTimeRange("2026-09-21T11:00:00.000Z", "2026-09-21T11:50:00.000Z")).toBe(
      "07:00 – 07:50",
    );
    expect(formatSessionDate("2026-09-21T11:00:00.000Z")).toBe("lunes 21 de septiembre");
  });
});
