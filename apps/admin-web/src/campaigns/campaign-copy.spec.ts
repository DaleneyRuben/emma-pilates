import { grantedLine, owedLine } from "./campaign-copy";

describe("campaign copy", () => {
  // FIX-064 (walkthrough finding 90): nobody is left out any more. A Client
  // without a current Plan gets the classes with her next one.
  it("says the Clients without a Plan get the classes with their next one", () => {
    expect(owedLine([])).toBeNull();
    expect(owedLine([{ name: "Sofía Guzmán" }])).toBe(
      "1 sin plan: se le suma en su próximo plan (Sofía Guzmán).",
    );
    expect(owedLine([{ name: "Mariana Peña" }, { name: "Sofía Guzmán" }])).toBe(
      "2 sin plan: se les suma en su próximo plan (Mariana Peña, Sofía Guzmán).",
    );
  });

  it("agrees the result with one or several Clients", () => {
    expect(grantedLine(1, 1)).toBe("1 clienta recibió 1 clase extra.");
    expect(grantedLine(7, 2)).toBe("7 clientas recibieron 2 clases extra.");
  });

  it("names at most ten Clients and counts the rest", () => {
    const owed = Array.from({ length: 13 }, (_, index) => ({
      name: `Clienta ${index + 1}`,
    }));
    expect(owedLine(owed)).toBe(
      "13 sin plan: se les suma en su próximo plan (Clienta 1, Clienta 2, Clienta 3, Clienta 4, Clienta 5, Clienta 6, Clienta 7, Clienta 8, Clienta 9, Clienta 10 y 3 más).",
    );
  });
});
