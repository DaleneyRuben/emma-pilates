import { describePlanTerms, describeValidity, describeWeeklyCap } from "./plan-terms";

// booking ADR-0005: every copy says days, never months, about validity.
describe("plan terms", () => {
  it("states the validity in days", () => {
    expect(describeValidity(30)).toBe("Válido por 30 días");
    expect(describeValidity(90)).toBe("Válido por 90 días");
  });

  it("states the Weekly Cap only when the Plan has one", () => {
    expect(describeWeeklyCap(3)).toBe("Hasta 3 clases por semana");
    expect(describeWeeklyCap(null)).toBeNull();
  });

  it("joins the classes, the days, and the cap on one line", () => {
    expect(describePlanTerms({ classAllowance: 1, durationDays: 30, weeklyClassCap: null })).toBe(
      "1 clase · válido por 30 días",
    );
    expect(describePlanTerms({ classAllowance: 16, durationDays: 60, weeklyClassCap: 3 })).toBe(
      "16 clases · válido por 60 días · hasta 3 por semana",
    );
  });
});
