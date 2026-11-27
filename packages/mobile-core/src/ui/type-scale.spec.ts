import { largeTextVariants, maxTextScale, textTones, textVariants } from "./type-scale";

const serif = "Lora_500Medium";
const regular = "WorkSans_400Regular";
const semibold = "WorkSans_600SemiBold";
const bold = "WorkSans_700Bold";

// Follow-up 285 (owner, 2026-11-20): thirteen styles and the named variants,
// with the apps' sizes. Each line height is the style's ratio rounded to a
// whole point. The face file carries the weight, so no style sets fontWeight.
describe("the Rosa Emma type scale", () => {
  it("holds exactly the approved styles and variants", () => {
    expect(textVariants).toEqual({
      "titulo-pagina": { fontFamily: serif, fontSize: 30, lineHeight: 33 },
      "titulo-pagina-tablet": { fontFamily: serif, fontSize: 36, lineHeight: 40 },
      "titulo-seccion": { fontFamily: serif, fontSize: 24, lineHeight: 28 },
      "titulo-bloque": { fontFamily: serif, fontSize: 22, lineHeight: 26 },
      "cifra-grande": {
        fontFamily: serif,
        fontSize: 34,
        fontVariant: ["tabular-nums"],
        lineHeight: 37,
      },
      cifra: { fontFamily: serif, fontSize: 24, fontVariant: ["tabular-nums"], lineHeight: 29 },
      destacado: { fontFamily: bold, fontSize: 19, lineHeight: 25 },
      "titulo-fila": { fontFamily: semibold, fontSize: 16, lineHeight: 22 },
      boton: { fontFamily: bold, fontSize: 16, lineHeight: 16 },
      "boton-chico": { fontFamily: bold, fontSize: 14, lineHeight: 14 },
      cuerpo: { fontFamily: regular, fontSize: 15, lineHeight: 23 },
      compacto: { fontFamily: regular, fontSize: 14, lineHeight: 20 },
      "compacto-600": { fontFamily: semibold, fontSize: 14, lineHeight: 20 },
      secundario: { fontFamily: regular, fontSize: 13, lineHeight: 19 },
      etiqueta: {
        fontFamily: bold,
        fontSize: 12,
        letterSpacing: 1.44,
        lineHeight: 14,
        textTransform: "uppercase",
      },
      pastilla: { fontFamily: bold, fontSize: 12, lineHeight: 14 },
      enlace: { fontFamily: bold, fontSize: 14, lineHeight: 20, textDecorationLine: "underline" },
      "enlace-cuerpo": {
        fontFamily: bold,
        fontSize: 15,
        lineHeight: 23,
        textDecorationLine: "underline",
      },
      "enlace-secundario": {
        fontFamily: bold,
        fontSize: 13,
        lineHeight: 19,
        textDecorationLine: "underline",
      },
    });
  });

  it("never writes under 12 pt", () => {
    const sizes = Object.values(textVariants).map((style) => style.fontSize);

    expect(Math.min(...sizes)).toBe(12);
  });

  it("allows only titles, figures and destacado on 100, 200 or 500", () => {
    expect(largeTextVariants).toEqual([
      "titulo-pagina",
      "titulo-pagina-tablet",
      "titulo-seccion",
      "titulo-bloque",
      "cifra-grande",
      "cifra",
      "destacado",
    ]);
  });

  // Follow-up 292 adds Destructivo, for «Cerrar sesión» on white.
  it("has three tones and a 1.3 cap on the phone's text size", () => {
    expect(textTones).toEqual({ ink: "#93615D", onDark: "#FFFBFB", destructivo: "#A04640" });
    expect(maxTextScale).toBe(1.3);
  });
});

describe("the loaded fonts", () => {
  it("are the four faces the scale uses and the field example's italic", () => {
    const { fontAssets } = require("./fonts") as { fontAssets: Record<string, unknown> };

    expect(Object.keys(fontAssets).sort()).toEqual([
      "Lora_500Medium",
      "WorkSans_400Regular",
      "WorkSans_400Regular_Italic",
      "WorkSans_600SemiBold",
      "WorkSans_700Bold",
    ]);
  });
});
