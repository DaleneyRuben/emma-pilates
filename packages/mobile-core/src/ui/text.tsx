import {
  Text as NativeText,
  type StyleProp,
  type TextProps as NativeTextProps,
  type TextStyle,
} from "react-native";

import {
  maxTextScale,
  textTones,
  textVariants,
  type TextTone,
  type TextVariant,
} from "./type-scale";

/** What a variant owns: a caller's style can never set these (follow-up 285). */
type TypographyKey =
  | "color"
  | "fontFamily"
  | "fontSize"
  | "fontStyle"
  | "fontVariant"
  | "fontWeight"
  | "letterSpacing"
  | "lineHeight"
  | "opacity"
  | "textDecorationColor"
  | "textDecorationLine"
  | "textDecorationStyle"
  | "textShadowColor"
  | "textShadowOffset"
  | "textShadowRadius"
  | "textTransform";

/** Layout only: margins, flex, alignment, width. Never type or colour. */
export type TextLayoutStyle = Omit<TextStyle, TypographyKey>;

export type TextProps = Omit<NativeTextProps, "style"> & {
  /** Crossed out, for a struck price or a past day; never instead of words. */
  strike?: boolean;
  style?: StyleProp<TextLayoutStyle>;
  /** `ink` (#93615D) everywhere; `onDark` (white) only on 600. */
  tone?: TextTone;
  variant: TextVariant;
};

/**
 * Every text in both apps (follow-up 285). The variant sets the face, size,
 * line height and spacing; the tone sets the colour; the text grows with the
 * phone's text size up to 1.3 times. A caller may lower that cap, never raise
 * it.
 */
export function Text({
  maxFontSizeMultiplier,
  strike = false,
  style,
  tone = "ink",
  variant,
  ...props
}: TextProps) {
  return (
    <NativeText
      {...props}
      maxFontSizeMultiplier={Math.min(maxFontSizeMultiplier ?? maxTextScale, maxTextScale)}
      style={[
        textVariants[variant],
        { color: textTones[tone] },
        strike && { textDecorationLine: "line-through" },
        style,
      ]}
    />
  );
}
