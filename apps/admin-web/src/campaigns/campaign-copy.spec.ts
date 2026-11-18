import { grantedLine, owedLine, pastCampaignLine } from "./campaign-copy";

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

  // Walkthrough finding 92: giving the same campaign twice gives the classes twice.
  describe("a campaign already given", () => {
    const past = [
      { name: "Fin de año", grantedAt: "2026-11-17T14:00:00.000Z" },
      { name: "Inicio de año", grantedAt: "2026-01-05T14:00:00.000Z" },
      { name: "Vacaciones", grantedAt: "2025-07-01T14:00:00.000Z" },
    ];
    const now = new Date("2026-11-18T15:00:00.000Z");

    it("warns with the day it was given, ignoring case and spaces", () => {
      expect(pastCampaignLine("  fin de AÑO ", past, now)).toBe(
        "Ya diste la campaña «Fin de año» el 17 de noviembre. Si la das otra vez, cada clienta recibe las clases de nuevo.",
      );
    });

    it("names the year when it was not this year", () => {
      expect(pastCampaignLine("Vacaciones", past, now)).toBe(
        "Ya diste la campaña «Vacaciones» el 1 de julio de 2025. Si la das otra vez, cada clienta recibe las clases de nuevo.",
      );
    });

    it("says nothing for a new name or an empty one", () => {
      expect(pastCampaignLine("Navidad", past, now)).toBeNull();
      expect(pastCampaignLine("   ", past, now)).toBeNull();
      expect(pastCampaignLine("Fin de año", [], now)).toBeNull();
    });
  });
});
