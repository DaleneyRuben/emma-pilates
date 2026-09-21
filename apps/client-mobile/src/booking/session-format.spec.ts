import {
  boliviaCivilDate,
  civilDateRange,
  dayChipLabel,
  formatSessionDate,
  formatTimeRange,
  upcomingCivilDates,
} from "./session-format";

describe("Session formatting", () => {
  it("derives the Bolivia civil date from an instant", () => {
    expect(boliviaCivilDate(new Date("2026-09-21T03:30:00.000Z"))).toBe(
      "2026-09-20",
    );
    expect(boliviaCivilDate(new Date("2026-09-21T04:00:00.000Z"))).toBe(
      "2026-09-21",
    );
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

  it("converts a civil date into the instant range the API expects", () => {
    expect(civilDateRange("2026-09-21")).toEqual({
      from: "2026-09-21T04:00:00.000Z",
      until: "2026-09-22T04:00:00.000Z",
    });
  });

  it("formats Bolivia time ranges and long dates", () => {
    expect(
      formatTimeRange("2026-09-21T11:00:00.000Z", "2026-09-21T11:50:00.000Z"),
    ).toBe("07:00 – 07:50");
    expect(formatSessionDate("2026-09-21T11:00:00.000Z")).toBe(
      "lunes 21 de septiembre",
    );
  });
});
