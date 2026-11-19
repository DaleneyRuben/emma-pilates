import { formatDayRange } from "./day-range";

describe("formatDayRange", () => {
  it("says the month once when both days share it", () => {
    expect(formatDayRange("2026-11-21", "2026-11-24")).toBe(
      "sáb 21 al mar 24 nov",
    );
  });

  it("names both months across a month's end", () => {
    expect(formatDayRange("2026-11-30", "2026-12-02")).toBe(
      "lun 30 nov al mié 2 dic",
    );
  });

  it("names both months across a year's end in the same month name", () => {
    expect(formatDayRange("2026-12-31", "2027-01-02")).toBe(
      "jue 31 dic al sáb 2 ene",
    );
  });
});
