import { homeGreeting } from "./home-greeting";

// P01: «Buenos días, Paola» with the day under it, in Bolivia time.
describe("the Inicio greeting", () => {
  it.each([
    ["2026-11-03T10:00:00.000Z", "Buenos días, Paola"],
    ["2026-11-03T16:00:00.000Z", "Buenas tardes, Paola"],
    ["2026-11-03T23:30:00.000Z", "Buenas noches, Paola"],
    ["2026-11-04T03:00:00.000Z", "Buenas noches, Paola"],
  ])("greets at %s with «%s»", (instant, greeting) => {
    expect(homeGreeting("Paola Mendoza", new Date(instant)).title).toBe(
      greeting,
    );
  });

  it("names the day and greets without a name until the profile arrives", () => {
    expect(homeGreeting("", new Date("2026-11-03T14:00:00.000Z"))).toEqual({
      title: "Buenos días",
      day: "Martes 3 de noviembre",
    });
  });
});
