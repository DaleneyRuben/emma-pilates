import { colors, radii, shadows, surfaces, typography } from "./tokens";

// Follow-up 225 (visual system v2): Lino replaces Blanco as the surface,
// Rosa profundo is the one emphasis, and the quiet tones meet AA on Lino.
describe("colour tokens (follow-up 225)", () => {
  it("names Lino, Rosa tinte and Rosa profundo", () => {
    expect(colors.card).toBe("#F5EFE9");
    expect(colors.primaryTint).toBe("#F2E4E1");
    expect(colors.emphasis).toBe("#93615D");
  });

  it("darkens the quiet text tones for Lino", () => {
    expect(colors.textMuted).toBe("#6F6662");
    expect(colors.textSecondary).toBe("#6F6662");
  });

  it("names Rosa enlace for text buttons and text on Rosa tinte", () => {
    expect(colors.primaryOnTint).toBe("#7D4F4B");
  });

  it("deepens Error for destructive labels and names its tint", () => {
    expect(colors.error).toBe("#A04E3E");
    expect(colors.errorText).toBe("#A04E3E");
    expect(colors.errorSurface).toBe("#F7E5E0");
  });

  it("names the Arena hairline", () => {
    expect(colors.hairline).toBe("#E6DBD0");
  });
});

// Follow-up 225 replaces MOB-039's Blanco card: cards are Lino with no border
// and no shadow; chips, notices, and insets keep 12.
describe("card tokens (follow-up 225)", () => {
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

  it("draws every card on Lino, without border or shadow", () => {
    expect(surfaces.card).toEqual({ backgroundColor: "#F5EFE9", borderRadius: 16 });
    expect(surfaces.flatCard).toEqual({ backgroundColor: "#F5EFE9", borderRadius: 16 });
  });

  it("rounds the emphasis card at 20 on Rosa profundo", () => {
    expect(surfaces.emphasis).toEqual({ backgroundColor: "#93615D", borderRadius: 20 });
  });

  it("names the empty states' sizes and wash", () => {
    expect(typography.titleSmall).toBe(19);
    expect(colors.neutralWash).toBe("rgba(216,201,187,0.18)");
  });
});

// MOB-040: the frames' quiet icon tone (empty-state glyphs, row chevrons) is
// not in the README palette yet; the apps name it once.
describe("quiet icon token (MOB-040)", () => {
  it("names the frames' quiet icon tone", () => {
    expect(colors.iconQuiet).toBe("#C4BAB6");
  });
});

// MOB-066: colours the screens wrote by hand become named tokens with the
// design's values (design system «Scrim», 24 «Cerrar mi cuenta», S06 «Vencida»).
describe("design tokens for hand-written colours (MOB-066)", () => {
  it("names the scrim behind sheets and modals", () => {
    expect(colors.scrim).toBe("rgba(74,58,48,0.22)");
  });

  it("names 24's disabled destructive button", () => {
    expect(colors.errorDisabledBorder).toBe("#E7CFC8");
    expect(colors.errorDisabledText).toBe("#D4A99F");
  });

  it("names 24's pending notice text on Advertencia tint", () => {
    expect(colors.warningTitle).toBe("#7C5D2A");
    expect(colors.warningBody).toBe("#6E5A36");
  });

  it("names the Error status pill at 12% alpha", () => {
    expect(colors.errorPill).toBe("rgba(178,93,75,0.12)");
  });
});
