import { freePlacesLabel } from "./free-places";

describe("freePlacesLabel", () => {
  it("says the free places out of the capacity", () => {
    expect(freePlacesLabel(5, 8)).toBe("5 de 8 libres");
  });

  it("names the last place and a full class", () => {
    expect(freePlacesLabel(1, 8)).toBe("Último lugar");
    expect(freePlacesLabel(0, 8)).toBe("Clase llena");
    expect(freePlacesLabel(-1, 8)).toBe("Clase llena");
  });
});
