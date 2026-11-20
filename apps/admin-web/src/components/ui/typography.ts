/**
 * Follow-up 285 (docs/design/prompts/followups/285-rosa-emma-type-scale.md):
 * the one type scale of the web and both apps. Every text on a page uses one
 * of these styles through its `tipo-*` class (`src/index.css`), which carries
 * family, size, weight, line-height, letter-spacing and case; colour comes
 * from the container (ink, or white on 600).
 *
 * This module is the scale's single description for code: the theme test
 * checks `index.css` against it and the e2e type audit measures every page
 * with it. It is one of the two files the typography lint rule exempts.
 */
export type TypeStyle = {
  family: "Lora" | "Work Sans";
  /** Size at 1440 px; `narrow` is the size below the md breakpoint. */
  size: number;
  narrow?: number;
  weight: 400 | 500 | 600 | 700;
  /**
   * What tells the style apart from another of the same size and weight:
   * a button's box, a link's underline, a label's capitals, or a pill's
   * lower case.
   */
  mark?: "box" | "underline" | "upper" | "lower";
  /** Large enough for 100, 200 and 500 (rule 3). */
  large?: true;
};

export const typeScale = {
  "titulo-pagina": {
    family: "Lora",
    size: 34,
    narrow: 30,
    weight: 500,
    large: true,
  },
  "titulo-seccion": { family: "Lora", size: 28, weight: 500, large: true },
  "titulo-bloque": { family: "Lora", size: 22, weight: 500, large: true },
  "cifra-grande": {
    family: "Lora",
    size: 34,
    narrow: 28,
    weight: 500,
    large: true,
  },
  cifra: { family: "Lora", size: 24, weight: 500, large: true },
  destacado: { family: "Work Sans", size: 19, weight: 700, large: true },
  "titulo-fila": { family: "Work Sans", size: 16, weight: 600 },
  boton: { family: "Work Sans", size: 16, weight: 700, mark: "box" },
  "boton-chico": { family: "Work Sans", size: 14, weight: 700, mark: "box" },
  cuerpo: { family: "Work Sans", size: 15, weight: 400 },
  compacto: { family: "Work Sans", size: 14, weight: 400 },
  "compacto-600": { family: "Work Sans", size: 14, weight: 600 },
  secundario: { family: "Work Sans", size: 13, weight: 400 },
  etiqueta: { family: "Work Sans", size: 12, weight: 700, mark: "upper" },
  pastilla: { family: "Work Sans", size: 12, weight: 700, mark: "lower" },
  enlace: { family: "Work Sans", size: 14, weight: 700, mark: "underline" },
  /**
   * A link inside a sentence or a row: the size of the text around it, in
   * 700 and underlined (15 in `cuerpo`, 13 in `secundario`).
   */
  "enlace-en-linea": {
    family: "Work Sans",
    size: 15,
    weight: 700,
    mark: "underline",
  },
} as const satisfies Record<string, TypeStyle>;

export type TypeStyleName = keyof typeof typeScale;

/**
 * The sizes an inline link can take: the size of `cuerpo` or `secundario`
 * around it.
 */
export const inlineLinkSizes = [15, 13] as const;
