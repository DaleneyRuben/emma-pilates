import { countLabel, dayHeading, minutesLabel, startTime } from "./session-time";

describe("v2 class row labels", () => {
  it("reads the start, the length and the day as the boards write them", () => {
    expect(startTime("2026-11-03T11:00:00.000Z", "2026-11-03T12:00:00.000Z")).toBe("07:00");
    expect(minutesLabel("2026-11-03T11:00:00.000Z", "2026-11-03T12:00:00.000Z")).toBe("60 min");
    expect(dayHeading("2026-11-03")).toBe("Martes 3 de noviembre");
    expect(countLabel(1, "clase", "clases")).toBe("1 clase");
    expect(countLabel(3, "clase", "clases")).toBe("3 clases");
  });
});
