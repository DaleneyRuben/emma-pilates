import { freezeRefusal, freezeSummary, freezeWindow } from "./freeze-window";

// Walkthrough finding 51: the calendar refuses before sending what the
// backend refuses (booking ADR-0010, freeze.ts), and says why.
const term = {
  today: "2026-11-08",
  termStartsOn: "2026-11-02",
  termEndsOn: "2027-01-30",
  queuedPlanStartsOn: null,
};

describe("freezeWindow", () => {
  it("offers up to 15 days from today through the term end", () => {
    const window = freezeWindow(term);

    expect(window.available).toBe(true);
    expect(window.firstDay).toBe("2026-11-08");
    expect(window.lastDay).toBe("2027-01-30");
    expect(window.maxDays("2026-11-16")).toBe(15);
    expect(window.maxDays("2027-01-25")).toBe(6);
  });

  it("explains a past day, a day after the end and a 16th day", () => {
    const window = freezeWindow(term);

    expect(window.whyOff("2026-11-07", null)).toBe(
      "Ese día ya pasó. El congelamiento empieza hoy o después.",
    );
    expect(window.whyOff("2027-01-31", null)).toBe(
      "Tu plan vence el sáb 30 ene: el congelamiento tiene que terminar ese día o antes.",
    );
    expect(window.whyOff("2026-12-01", "2026-11-16")).toBe(
      "Puedes congelar hasta 15 días: el último día posible es el lun 30 nov.",
    );
    expect(window.whyOff("2026-11-30", "2026-11-16")).toBeNull();
    // A day before the chosen start begins a new range.
    expect(window.whyOff("2026-11-10", "2026-11-16")).toBeNull();
  });

  it("caps the days so the moved end stays before a queued plan", () => {
    const window = freezeWindow({ ...term, queuedPlanStartsOn: "2027-02-10" });

    expect(window.maxDays("2026-11-16")).toBe(10);
    expect(window.whyOff("2026-11-26", "2026-11-16")).toBe(
      "Tu plan siguiente empieza el mié 10 feb: puedes congelar hasta 10 días.",
    );
  });

  it("is off when the queued plan starts the day after this one ends", () => {
    const window = freezeWindow({ ...term, queuedPlanStartsOn: "2027-01-31" });

    expect(window.available).toBe(false);
    expect(window.unavailableReason).toBe(
      "Tu plan siguiente empieza el dom 31 ene, al día siguiente de que vence este: ya no se puede congelar.",
    );
  });
});

describe("freezeSummary", () => {
  it("names the range, the days and the moved end", () => {
    expect(freezeSummary("2027-01-30", "2026-11-16", "2026-11-22")).toEqual({
      range: "Del lun 16 al dom 22 nov",
      days: "7 días",
      frozenDays: 7,
      newEndsOn: "2027-02-06",
      newEnd: "sáb 6 feb",
      was: "antes, el sáb 30 ene",
    });
    expect(freezeSummary("2027-01-30", "2026-11-30", "2026-12-01").range).toBe(
      "Del lun 30 nov al mar 1 dic",
    );
    expect(freezeSummary("2027-01-30", "2026-11-16", "2026-11-16").days).toBe("1 día");
  });
});

describe("freezeRefusal", () => {
  it("names what failed once the plan is read again", () => {
    expect(freezeRefusal({ ...term, freezeState: "requested" }, "2026-11-16", "2026-11-22")).toBe(
      "Ya pediste un congelamiento para este plan.",
    );
    expect(
      freezeRefusal(
        { ...term, queuedPlanStartsOn: "2027-01-31", freezeState: null },
        "2026-11-16",
        "2026-11-22",
      ),
    ).toBe(
      "Tu plan siguiente empieza el dom 31 ene, al día siguiente de que vence este: ya no se puede congelar.",
    );
    expect(
      freezeRefusal(
        { ...term, today: "2026-11-17", freezeState: null },
        "2026-11-16",
        "2026-11-22",
      ),
    ).toBe("Ese día ya pasó. El congelamiento empieza hoy o después.");
    expect(freezeRefusal({ ...term, freezeState: null }, "2026-11-16", "2026-11-22")).toBeNull();
  });
});
