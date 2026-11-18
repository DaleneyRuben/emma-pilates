import { monthOpenLine, otherPeriodSearch } from "./pay-period-search";

// FIX-084 (Sueldos B): «Otro período» and the one help line, by the day.
describe("Sueldos' Otro período", () => {
  it("pays up to yesterday inside the open month", () => {
    expect(otherPeriodSearch({ month: "2026-11" }, "2026-11-18")).toEqual({
      month: "2026-11",
      period: "range",
      from: "2026-11-01",
      to: "2026-11-17",
    });
  });

  it("opens the whole month on its 1st, when nothing in it is over", () => {
    expect(otherPeriodSearch({ month: "2026-11" }, "2026-11-01")).toEqual({
      month: "2026-11",
      period: "range",
      from: "2026-11-01",
      to: "2026-11-30",
    });
  });

  it("opens a past month as a whole range", () => {
    expect(otherPeriodSearch({ month: "2026-09" }, "2026-11-18")).toEqual({
      month: "2026-09",
      period: "range",
      from: "2026-09-01",
      to: "2026-09-30",
    });
  });
});

describe("Sueldos' help line", () => {
  it("points to Otro período while part of the month is over", () => {
    expect(monthOpenLine("2026-11", "2026-11-18")).toBe(
      "Noviembre cierra el 30. Para pagarle antes a una instructora, elige «Otro período».",
    );
  });

  it("only says when the month closes on its 1st", () => {
    expect(monthOpenLine("2026-11", "2026-11-01")).toBe(
      "Noviembre cierra el 30.",
    );
  });
});
