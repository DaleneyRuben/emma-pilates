import { maxTextScale, textTones, textVariants, typeFaces } from "./type-scale";

/**
 * The text of a field (follow-up 285): `cuerpo` in ink, and the example text
 * of an empty field in the same ink, in italic, so it never reads as typed
 * (rule 7). React Native draws the placeholder with the input's own face, so
 * the face follows the value. A field box takes no line height: iOS would
 * push the caret off the text's centre.
 *
 * A counted amount (board E-S05) is typed as the figure it is, in
 * `cifra-grande`; Lora has no italic loaded, so its «0» stays upright.
 */
export function fieldTextProps(
  value: string | undefined,
  variant: "cuerpo" | "cifra-grande" = "cuerpo",
) {
  const empty = value === undefined || value.length === 0;
  const common = {
    maxFontSizeMultiplier: maxTextScale,
    placeholderTextColor: textTones.ink,
  } as const;
  if (variant === "cifra-grande") {
    const { fontFamily, fontSize, fontVariant } = textVariants["cifra-grande"];
    return { ...common, style: { color: textTones.ink, fontFamily, fontSize, fontVariant } };
  }
  return {
    ...common,
    style: {
      color: textTones.ink,
      fontFamily: empty ? typeFaces.italic : typeFaces.regular,
      fontSize: textVariants.cuerpo.fontSize,
    },
  };
}
