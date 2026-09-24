import {
  addDays,
  boliviaInstant,
  boliviaParts,
  boliviaToday,
  formatCivilMoment,
  formatDayTab,
  formatSessionMoment,
  formatWeekRange,
  weekStartOf,
} from "./bolivia-time";

// ADR-0057: every schedule is read and written in Bolivia civil time,
// whatever zone the browser runs in; instants travel as UTC ISO strings.
describe("Bolivia civil time", () => {
  it("finds the Bolivia calendar date of an instant, even near UTC midnight", () => {
    expect(boliviaToday(new Date("2026-09-24T02:30:00.000Z"))).toBe(
      "2026-09-23",
    );
    expect(boliviaToday(new Date("2026-09-24T04:00:00.000Z"))).toBe(
      "2026-09-24",
    );
  });

  it("starts weeks on Monday and walks civil dates across months", () => {
    expect(weekStartOf("2026-09-23")).toBe("2026-09-21");
    expect(weekStartOf("2026-09-27")).toBe("2026-09-21");
    expect(weekStartOf("2026-09-21")).toBe("2026-09-21");
    expect(addDays("2026-09-28", 7)).toBe("2026-10-05");
    expect(addDays("2026-10-01", -1)).toBe("2026-09-30");
  });

  it("turns a Bolivia date and wall clock into the exact instant and back", () => {
    expect(boliviaInstant("2026-09-26", "16:00")).toBe(
      "2026-09-26T20:00:00.000Z",
    );
    expect(boliviaInstant("2026-09-26", "21:30")).toBe(
      "2026-09-27T01:30:00.000Z",
    );
    expect(boliviaParts("2026-09-27T01:30:00.000Z")).toEqual({
      date: "2026-09-26",
      time: "21:30",
      weekday: 6,
      minutes: 21 * 60 + 30,
    });
  });

  it("labels the week, the day tabs, and a Session in Spanish", () => {
    expect(formatWeekRange("2026-09-21")).toBe("21 – 27 de septiembre de 2026");
    expect(formatWeekRange("2026-09-28")).toBe(
      "28 de septiembre – 4 de octubre de 2026",
    );
    expect(formatWeekRange("2026-12-28")).toBe(
      "28 de diciembre de 2026 – 3 de enero de 2027",
    );
    expect(formatDayTab("2026-09-23")).toEqual({ weekday: "Mié", day: "23" });
    expect(formatSessionMoment("2026-09-23T20:00:00.000Z")).toBe(
      "Mié 23 sep · 16:00",
    );
  });

  it("writes an instant as its Bolivia date and 24-hour time", () => {
    // 01:30 UTC on the 16th is still the evening of the 15th in Bolivia.
    expect(formatCivilMoment("2026-09-16T01:30:00.000Z")).toBe(
      "15/09/2026 · 21:30",
    );
    expect(formatCivilMoment("2026-08-15T13:12:00.000Z")).toBe(
      "15/08/2026 · 09:12",
    );
  });
});
