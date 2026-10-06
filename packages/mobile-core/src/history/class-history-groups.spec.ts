import {
  classCountLabel,
  groupClassHistoryByMonth,
  historyDayLabel,
  summarizeClassHistory,
} from "./class-history-groups";

const entry = (bookingId: string, startsAt: string) => ({
  bookingId,
  sessionId: `session-${bookingId}`,
  classTypeName: "Reformer Pilates",
  trainerName: "Emma Vargas",
  branchName: "Centro",
  startsAt,
  endsAt: startsAt,
});

// MOB-040: 07 and S22 group the attended classes by month, head each group
// with its count, and open with «N clases desde <mes>».
describe("class history groups", () => {
  it("groups the newest-first entries by month, keeping their order", () => {
    const groups = groupClassHistoryByMonth([
      entry("3", "2026-09-05T13:00:00.000Z"),
      entry("2", "2026-08-26T11:00:00.000Z"),
      entry("1", "2026-08-19T11:00:00.000Z"),
    ]);

    expect(groups.map((group) => [group.heading, group.entries.map((e) => e.bookingId)])).toEqual([
      ["Septiembre 2026", ["3"]],
      ["Agosto 2026", ["2", "1"]],
    ]);
  });

  it("counts classes in Spanish, singular and plural", () => {
    expect(classCountLabel(1)).toBe("1 clase");
    expect(classCountLabel(6)).toBe("6 clases");
  });

  it("summarizes the history since the oldest month", () => {
    expect(
      summarizeClassHistory([
        entry("3", "2026-09-05T13:00:00.000Z"),
        entry("2", "2026-08-26T11:00:00.000Z"),
        entry("1", "2026-08-19T11:00:00.000Z"),
      ]),
    ).toBe("3 clases desde agosto");
    expect(summarizeClassHistory([entry("1", "2026-08-19T11:00:00.000Z")])).toBe(
      "1 clase desde agosto",
    );
  });

  it("names the year when the oldest class is in an earlier one", () => {
    expect(
      summarizeClassHistory([
        entry("2", "2026-01-05T13:00:00.000Z"),
        entry("1", "2025-11-19T11:00:00.000Z"),
      ]),
    ).toBe("2 clases desde noviembre de 2025");
  });

  it("labels a row's day column with the Bolivia date, zero-padded", () => {
    expect(historyDayLabel("2026-09-05T13:00:00.000Z")).toEqual({ day: "05", weekday: "sáb" });
    // 03:00 UTC is still the previous evening in La Paz.
    expect(historyDayLabel("2026-08-19T03:00:00.000Z")).toEqual({ day: "18", weekday: "mar" });
  });
});
