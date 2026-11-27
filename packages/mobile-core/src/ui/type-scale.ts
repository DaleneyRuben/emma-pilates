import { brand, rosa } from "./tokens";

/**
 * The Rosa Emma type scale (follow-up 285, owner 2026-11-20): the same
 * thirteen styles as the web, with the apps' sizes, plus the named variants.
 * Every text in both apps is one of these and nothing else; `Text` is the only
 * place that reads this table.
 *
 * Each style names its face file, which carries the weight. A custom font
 * with a separate `fontWeight` makes Android synthesise a bolder face or fall
 * back to the system font, so no style sets `fontWeight`.
 */
export const typeFaces = {
  serif: "Lora_500Medium",
  regular: "WorkSans_400Regular",
  /** The example text of an empty field: the same ink, in italic. */
  italic: "WorkSans_400Regular_Italic",
  semibold: "WorkSans_600SemiBold",
  bold: "WorkSans_700Bold",
} as const;

type FaceName = (typeof typeFaces)[keyof typeof typeFaces];

export type TextVariantStyle = {
  fontFamily: FaceName;
  fontSize: number;
  fontVariant?: "tabular-nums"[];
  letterSpacing?: number;
  lineHeight: number;
  textDecorationLine?: "underline";
  textTransform?: "uppercase";
};

/** The spec's line-height ratio, rounded to a whole point. */
function face(fontFamily: FaceName, fontSize: number, ratio: number) {
  return { fontFamily, fontSize, lineHeight: Math.round(fontSize * ratio) };
}

const tabular = { fontVariant: ["tabular-nums"] as "tabular-nums"[] };
const underline = { textDecorationLine: "underline" as const };

export const textVariants = {
  "titulo-pagina": face(typeFaces.serif, 30, 1.1),
  /** The page title in a tablet's header band (follow-up 289). */
  "titulo-pagina-tablet": face(typeFaces.serif, 36, 1.1),
  "titulo-seccion": face(typeFaces.serif, 24, 1.15),
  "titulo-bloque": face(typeFaces.serif, 22, 1.2),
  "cifra-grande": { ...face(typeFaces.serif, 34, 1.1), ...tabular },
  cifra: { ...face(typeFaces.serif, 24, 1.2), ...tabular },
  destacado: face(typeFaces.bold, 19, 1.3),
  "titulo-fila": face(typeFaces.semibold, 16, 1.35),
  boton: face(typeFaces.bold, 16, 1),
  "boton-chico": face(typeFaces.bold, 14, 1),
  cuerpo: face(typeFaces.regular, 15, 1.5),
  compacto: face(typeFaces.regular, 14, 1.45),
  /** A field's label: the one weight variant outside the table. */
  "compacto-600": face(typeFaces.semibold, 14, 1.45),
  secundario: face(typeFaces.regular, 13, 1.45),
  etiqueta: {
    ...face(typeFaces.bold, 12, 1.2),
    letterSpacing: 1.44,
    textTransform: "uppercase" as const,
  },
  pastilla: face(typeFaces.bold, 12, 1.2),
  /** A link standing on its own, such as «Volver» or «Ver horario». */
  enlace: { ...face(typeFaces.bold, 14, 1.45), ...underline },
  /** A link inside a `cuerpo` sentence: the sentence's size, bold, underlined. */
  "enlace-cuerpo": { ...face(typeFaces.bold, 15, 1.5), ...underline },
  /** A link inside a `secundario` line or a row. */
  "enlace-secundario": { ...face(typeFaces.bold, 13, 1.45), ...underline },
  /**
   * Perfil's footer on Fondo, in `texto-pie` (follow-up 293): an exception to
   * the scale that appears nowhere else.
   */
  pie: face(typeFaces.regular, 12, 1.5),
  /** A footer link: the same regular weight, underlined. */
  "enlace-pie": { ...face(typeFaces.regular, 12, 1.5), ...underline },
} satisfies Record<string, TextVariantStyle>;

export type TextVariant = keyof typeof textVariants;

/**
 * The only styles allowed straight on the 100 screen, the 200 band or a 500
 * block. Any other text goes inside a white card (rule 3).
 */
export const largeTextVariants: readonly TextVariant[] = [
  "titulo-pagina",
  "titulo-pagina-tablet",
  "titulo-seccion",
  "titulo-bloque",
  "cifra-grande",
  "cifra",
  "destacado",
];

/** One ink, and white on 600 (rule 5: never transparent). */
export const textTones = {
  ink: rosa[600],
  onDark: brand.white,
  /** «Cerrar sesión» on white only (follow-up 292). */
  destructivo: brand.destructivo,
  /** Perfil's footer on Fondo, with `pie` and `enlace-pie` only (follow-up 293). */
  "texto-pie": brand.textoPie,
} as const;

/** The footer's styles, the only small text allowed on Fondo (follow-up 293). */
export const footerTextVariants: readonly TextVariant[] = ["pie", "enlace-pie"];

export type TextTone = keyof typeof textTones;

/** Text grows with the phone's text size up to 1.3 times (rule 9). */
export const maxTextScale = 1.3;
