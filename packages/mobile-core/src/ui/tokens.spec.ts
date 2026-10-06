import { colors, radii, shadows, surfaces, typography } from "./tokens";

// Follow-up 70: the quiet text tones meet AA (4.5:1) on Blanco and Superficie
// sutil, and text on Palo de rosa tinte has its own deeper tone.
describe("colour tokens (follow-up 70)", () => {
  it("darkens the two quiet text tones", () => {
    expect(colors.textMuted).toBe("#766D69");
    expect(colors.textSubtle).toBe("#7A716D");
  });

  it("names the text tone for Palo de rosa tinte", () => {
    expect(colors.primaryTint).toBe("#EFE0DC");
    expect(colors.primaryOnTint).toBe("#7A4F4B");
  });
});

// MOB-039: the mobile frames draw every card on Blanco with a 1 px Borde
// fuerte, radius 16, and a soft shadow; chips, notices, and insets keep 12.
describe("card tokens (MOB-039)", () => {
  it("rounds cards at 16 and insets at 12", () => {
    expect(radii.card).toBe(16);
    expect(radii.inset).toBe(12);
  });

  it("casts the frames' soft card shadow", () => {
    expect(shadows.card).toEqual({
      elevation: 1,
      shadowColor: "#4A4A4A",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
    });
  });

  it("shares one card surface, with and without the shadow", () => {
    expect(surfaces.card).toEqual({
      backgroundColor: "#FFFFFF",
      borderColor: "#D8C9BB",
      borderRadius: 16,
      borderWidth: 1,
      ...shadows.card,
    });
    expect(surfaces.flatCard).toEqual({
      backgroundColor: "#FFFFFF",
      borderColor: "#D8C9BB",
      borderRadius: 16,
      borderWidth: 1,
    });
  });

  it("names the empty states' sizes and wash", () => {
    expect(typography.titleSmall).toBe(19);
    expect(colors.neutralWash).toBe("rgba(216,201,187,0.18)");
  });
});
