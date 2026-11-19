import { brand, colors, radii, shadows, surfaces, typography } from "./tokens";

// FIX-089 (palette B, owner 2026-11-19): every screen uses only the five brand
// colours; the scrim is Rosa profundo at low alpha.
const five = ["#E7CCBF", "#CDA697", "#B78380", "#93615D", "#F9F4F2"];

describe("palette B tokens (FIX-089)", () => {
  it("names the five brand colours", () => {
    expect(brand).toEqual({
      rubor: "#E7CCBF",
      arcilla: "#CDA697",
      paloDeRosa: "#B78380",
      rosaProfundo: "#93615D",
      crema: "#F9F4F2",
    });
  });

  it("maps every colour token onto the five colours", () => {
    const offPalette = Object.entries(colors).filter(
      ([name, value]) => name !== "scrim" && !five.includes(value),
    );
    expect(offPalette).toEqual([]);
  });

  it("writes all text in Rosa profundo", () => {
    expect(colors.text).toBe("#93615D");
    expect(colors.textMuted).toBe("#93615D");
    expect(colors.textSecondary).toBe("#93615D");
    expect(colors.textSubtle).toBe("#93615D");
  });

  it("fills buttons and selected chips with Rosa profundo and Crema labels", () => {
    expect(colors.primary).toBe("#93615D");
    expect(colors.onPrimary).toBe("#F9F4F2");
  });

  it("draws the hero block in Palo de rosa with Crema text", () => {
    expect(colors.emphasis).toBe("#B78380");
    expect(colors.onEmphasis).toBe("#F9F4F2");
  });

  it("keeps states out of colour: error, warning and success are Rosa profundo", () => {
    expect(colors.error).toBe("#93615D");
    expect(colors.warning).toBe("#93615D");
    expect(colors.success).toBe("#93615D");
  });

  it("uses Rubor for soft backgrounds and Arcilla for borders", () => {
    expect(colors.primaryTint).toBe("#E7CCBF");
    expect(colors.border).toBe("#CDA697");
    expect(colors.borderStrong).toBe("#CDA697");
    expect(colors.hairline).toBe("#E7CCBF");
  });

  it("puts the scrim on Rosa profundo", () => {
    expect(colors.scrim).toBe("rgba(147,97,93,0.35)");
  });
});

describe("card tokens (FIX-089)", () => {
  it("rounds cards at 16 and insets at 12", () => {
    expect(radii.card).toBe(16);
    expect(radii.inset).toBe(12);
    expect(radii.button).toBe(12);
  });

  it("draws cards on Crema with a 1px Arcilla border and no shadow", () => {
    expect(surfaces.card).toEqual({
      backgroundColor: "#F9F4F2",
      borderColor: "#CDA697",
      borderRadius: 16,
      borderWidth: 1,
    });
    expect(shadows.card.shadowOpacity).toBe(0);
    expect(shadows.button.shadowOpacity).toBe(0);
  });

  it("rounds the hero block at 18 on Palo de rosa", () => {
    expect(surfaces.emphasis).toEqual({ backgroundColor: "#B78380", borderRadius: 18 });
  });

  it("names the empty states' title size", () => {
    expect(typography.titleSmall).toBe(19);
  });
});
