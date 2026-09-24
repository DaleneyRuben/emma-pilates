import {
  chartScale,
  defaultReportRange,
  monthTotals,
  reportMonths,
} from "./report-range";

describe("the report's range", () => {
  it("opens on the last six Bolivia months up to today", () => {
    expect(defaultReportRange("2026-09-24")).toEqual({
      from: "2026-04-01",
      to: "2026-09-24",
    });
    expect(defaultReportRange("2026-02-10")).toEqual({
      from: "2025-09-01",
      to: "2026-02-10",
    });
  });

  it("walks every month the range touches, even an empty one", () => {
    expect(reportMonths("2026-07-15", "2026-09-02")).toEqual([
      "2026-07",
      "2026-08",
      "2026-09",
    ]);
    expect(reportMonths("2025-12-31", "2026-01-01")).toEqual([
      "2025-12",
      "2026-01",
    ]);
  });

  it("pairs each month's income and expenses with their net", () => {
    expect(
      monthTotals(
        ["2026-08", "2026-09"],
        [{ month: "2026-09-01", totalCentavos: 50_000 }],
        [
          { month: "2026-08-01", totalCentavos: 20_000 },
          { month: "2026-09-01", totalCentavos: 80_000 },
        ],
      ),
    ).toEqual([
      {
        month: "2026-08",
        incomeCentavos: 0,
        expensesCentavos: 20_000,
        netCentavos: -20_000,
      },
      {
        month: "2026-09",
        incomeCentavos: 50_000,
        expensesCentavos: 80_000,
        netCentavos: -30_000,
      },
    ]);
  });

  it("rounds the chart's top to a clean figure with three reference lines", () => {
    // Bs 45.123 at most → a top of Bs 50.000, lines at 0, 25.000, 50.000.
    expect(chartScale(4_512_300)).toEqual({
      topCentavos: 5_000_000,
      ticksCentavos: [0, 2_500_000, 5_000_000],
    });
    expect(chartScale(180_000)).toEqual({
      topCentavos: 200_000,
      ticksCentavos: [0, 100_000, 200_000],
    });
    expect(chartScale(0)).toEqual({
      topCentavos: 100_000,
      ticksCentavos: [0, 50_000, 100_000],
    });
  });
});
