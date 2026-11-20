import { maxTextScale, textTones, textVariants, typeFaces } from "./type-scale";

/**
 * The text of a field (follow-up 285): `cuerpo` in ink, and the example text
 * of an empty field in the same ink, in italic, so it never reads as typed
 * (rule 7). React Native draws the placeholder with the input's own face, so
 * the face follows the value. A field box takes no line height: iOS would
 * push the caret off the text's centre.
 */
export function fieldTextProps(value: string | undefined) {
  const empty = value === undefined || value.length === 0;
  return {
    maxFontSizeMultiplier: maxTextScale,
    placeholderTextColor: textTones.ink,
    style: {
      color: textTones.ink,
      fontFamily: empty ? typeFaces.italic : typeFaces.regular,
      fontSize: textVariants.cuerpo.fontSize,
    },
  } as const;
}
