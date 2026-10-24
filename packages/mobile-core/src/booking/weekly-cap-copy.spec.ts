import { weeklyClassesLeftLine } from "./weekly-cap-copy";

describe("weekly classes left", () => {
  it("says nothing when the Plan has no cap", () => {
    expect(weeklyClassesLeftLine(null)).toBeNull();
    expect(weeklyClassesLeftLine(undefined)).toBeNull();
  });

  it("uses the singular for one class and keeps zero honest", () => {
    expect(weeklyClassesLeftLine(1)).toBe("Te queda 1 clase esta semana");
    expect(weeklyClassesLeftLine(0)).toBe("Te quedan 0 clases esta semana");
    expect(weeklyClassesLeftLine(3)).toBe("Te quedan 3 clases esta semana");
  });
});
