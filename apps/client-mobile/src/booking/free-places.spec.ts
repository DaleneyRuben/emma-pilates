import { freePlacesLabel } from "./free-places";

describe("freePlacesLabel", () => {
  it("says the free places out of the capacity", () => {
    expect(freePlacesLabel(3, 8)).toBe("5 de 8 libres");
  });

  it("names the last place and a full class", () => {
    expect(freePlacesLabel(7, 8)).toBe("Último lugar");
    expect(freePlacesLabel(8, 8)).toBe("Clase llena");
    expect(freePlacesLabel(9, 8)).toBe("Clase llena");
  });
});
