import { brand, colors, radii, rosa, shadows, surfaces } from "./tokens";

// Rosa Emma (follow-up 284, owner 2026-11-20): one scale of seven tones plus
// crema and white. Rosa profundo (600) is the darkest tone: no greys, no inks.
const scale = ["#FEF6F2", "#F9E7DF", "#E7CCBF", "#DAB9AB", "#CDA697", "#B78380", "#93615D"];
const allowed = [...scale, "#F9F4F2", "#FFFBFB"];

describe("Rosa Emma tokens", () => {
  it("names the seven tones of the scale", () => {
    expect(rosa).toEqual({
      50: "#FEF6F2",
      100: "#F9E7DF",
      200: "#E7CCBF",
      300: "#DAB9AB",
      400: "#CDA697",
      500: "#B78380",
      600: "#93615D",
    });
    expect(brand.white).toBe("#FFFBFB");
    expect(brand.crema).toBe("#F9F4F2");
  });

  it("maps every colour token onto the scale, crema or white", () => {
    const offScale = Object.entries(colors).filter(
      ([name, value]) => name !== "scrim" && !allowed.includes(value),
    );
    // Follow-up 292: Destructivo is the one hue outside the rosa family;
    // follow-up 293 adds the footer's slightly darker Rosa profundo.
    expect(offScale).toEqual([
      ["destructivo", "#A04640"],
      ["textoPie", "#8A5B57"],
    ]);
  });

  // Follow-up 293 (owner 2026-11-27): Rosa profundo reaches only 4.27:1 on
  // Fondo, so Perfil's footer writes in #8A5B57 (4.72:1), and only there.
  it("names texto-pie #8A5B57 for Perfil's footer", () => {
    expect(brand.textoPie).toBe("#8A5B57");
    expect(colors.textoPie).toBe("#8A5B57");
  });

  // Follow-up 292 (owner 2026-11-27): a muted brick for actions that end
  // something, «Cerrar sesión» and its confirmation, with white on it.
  it("names Destructivo #A04640 with white on it", () => {
    expect(brand.destructivo).toBe("#A04640");
    expect(colors.destructivo).toBe("#A04640");
    expect(colors.onDestructivo).toBe("#FFFBFB");
  });

  it("paints the screen 100 and the header band 200", () => {
    expect(colors.background).toBe("#F9E7DF");
    expect(colors.surface).toBe("#F9E7DF");
    expect(colors.band).toBe("#E7CCBF");
  });

  it("draws cards white", () => {
    expect(colors.card).toBe("#FFFBFB");
    expect(colors.white).toBe("#FFFBFB");
  });

  it("writes all text in rosa profundo", () => {
    expect(colors.text).toBe("#93615D");
    expect(colors.textMuted).toBe("#93615D");
  });

  it("fills the primary button, the hero and selected states with 600 and white text", () => {
    expect(colors.primary).toBe("#93615D");
    expect(colors.onPrimary).toBe("#FFFBFB");
    expect(colors.emphasis).toBe("#93615D");
    expect(colors.onEmphasis).toBe("#FFFBFB");
  });

  it("keeps the medio block on 500 with white text", () => {
    expect(colors.medio).toBe("#B78380");
    expect(colors.onMedio).toBe("#FFFBFB");
  });

  it("uses 50 for soft insets and 400 for outlines", () => {
    expect(colors.primaryTint).toBe("#FEF6F2");
    expect(colors.borderStrong).toBe("#CDA697");
    expect(colors.hairline).toBe("#F9E7DF");
  });

  it("colours the class-type bars by type", () => {
    expect(colors.typeReformer).toBe("#93615D");
    expect(colors.typeMat).toBe("#DAB9AB");
    expect(colors.typeCadillac).toBe("#B78380");
  });

  it("puts the scrim on rosa profundo", () => {
    expect(colors.scrim).toBe("rgba(147,97,93,0.42)");
  });
});

describe("Rosa Emma surfaces", () => {
  it("rounds cards at 20, the hero at 24, buttons at 16 and the band at 28", () => {
    expect(radii.card).toBe(20);
    expect(radii.hero).toBe(24);
    expect(radii.button).toBe(16);
    expect(radii.band).toBe(28);
  });

  it("lifts white cards with a soft rosa shadow and no border", () => {
    expect(surfaces.card).toEqual({
      backgroundColor: "#FFFBFB",
      borderRadius: 20,
      boxShadow: "0 1px 2px rgba(147,97,93,0.08), 0 4px 14px rgba(147,97,93,0.10)",
    });
    expect(shadows.card.boxShadow).toContain("rgba(147,97,93");
  });

  it("draws the hero on 600 with a deeper shadow", () => {
    expect(surfaces.emphasis).toEqual({
      backgroundColor: "#93615D",
      borderRadius: 24,
      boxShadow: "0 10px 28px rgba(147,97,93,0.30)",
    });
  });
});
