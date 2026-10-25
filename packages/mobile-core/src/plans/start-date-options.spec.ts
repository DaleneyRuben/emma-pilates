import { renewalStartsOn, startDateOptions } from "./start-date-options";

describe("start date options", () => {
  const today = "2026-10-23";

  it("offers today through the limit, with Hoy first", () => {
    const options = startDateOptions({
      today,
      startDateLimitDays: 14,
      openingDate: null,
    });

    expect(options).toHaveLength(15);
    expect(options[0]).toMatchObject({ date: today, weekday: "Hoy" });
    expect(options[1]?.date).toBe("2026-10-24");
    expect(options.at(-1)?.date).toBe("2026-11-06");
  });

  it("offers the Opening Date when it sits past the limit", () => {
    const options = startDateOptions({
      today,
      startDateLimitDays: 14,
      openingDate: "2026-11-22",
    });

    expect(options.at(-1)).toMatchObject({
      date: "2026-11-22",
      weekday: "Día de apertura",
    });
  });

  it("does not add a presale chip when the Opening Date is already in the window", () => {
    const options = startDateOptions({
      today,
      startDateLimitDays: 14,
      openingDate: "2026-10-30",
    });

    expect(options).toHaveLength(15);
    expect(options.some((option) => option.weekday === "Día de apertura")).toBe(false);
  });

  it("starts a renewal with classes left the day after the current plan ends", () => {
    expect(renewalStartsOn("2026-10-26")).toBe("2026-10-27");
  });
});
