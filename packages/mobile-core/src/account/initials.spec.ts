import { initials } from "./initials";

describe("initials", () => {
  it("takes the first letters of the first two names in upper case", () => {
    expect(initials("Emma Vargas")).toBe("EV");
    expect(initials("  maría fernanda loza ")).toBe("MF");
    expect(initials("Camila")).toBe("C");
  });
});
