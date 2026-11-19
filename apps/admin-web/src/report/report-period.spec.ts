import {
  changeLine,
  comparedMonths,
  periodOf,
  periodRange,
} from "./report-period";

// FIX-091 (W5 B): the period chips and the month against the one before.
describe("the report's period", () => {
  it("turns each chip into a range that ends today", () => {
    expect(periodRange("month", "2026-02-10")).toEqual({
      from: "2026-02-01",
      to: "2026-02-10",
    });
    expect(periodRange("quarter", "2026-02-10")).toEqual({
      from: "2025-12-01",
      to: "2026-02-10",
    });
    expect(periodRange("half", "2026-02-10")).toEqual({
      from: "2025-09-01",
      to: "2026-02-10",
    });
  });

  it("names the chip a range matches, and none for a chosen range", () => {
    const today = "2026-11-19";
    expect(periodOf({ from: "2026-11-01", to: today }, today)).toBe("month");
    expect(periodOf({ from: "2026-09-01", to: today }, today)).toBe("quarter");
    expect(periodOf({ from: "2026-06-01", to: today }, today)).toBe("half");
    expect(
      periodOf({ from: "2026-11-01", to: "2026-11-18" }, today),
    ).toBeUndefined();
  });

  it("compares the month the range ends in with the whole month before", () => {
    expect(comparedMonths("2026-11-19")).toEqual({
      current: { month: "2026-11", from: "2026-11-01", to: "2026-11-19" },
      previous: { month: "2026-10", from: "2026-10-01", to: "2026-10-31" },
    });
    expect(comparedMonths("2026-03-31").previous).toEqual({
      month: "2026-02",
      from: "2026-02-01",
      to: "2026-02-28",
    });
    expect(comparedMonths("2026-01-05").previous).toEqual({
      month: "2025-12",
      from: "2025-12-01",
      to: "2025-12-31",
    });
  });

  it("says how much more or less came in than the month before", () => {
    expect(changeLine(674_000, 601_000, "2026-10")).toBe("+12 % que octubre");
    expect(changeLine(570_950, 601_000, "2026-10")).toBe("−5 % que octubre");
    expect(changeLine(601_000, 601_000, "2026-10")).toBe("Igual que octubre");
    expect(changeLine(674_000, 0, "2026-10")).toBeNull();
  });
});
