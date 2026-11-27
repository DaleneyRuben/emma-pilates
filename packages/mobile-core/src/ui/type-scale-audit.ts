import { StyleSheet, type TextStyle } from "react-native";

import { brand, rosa } from "./tokens";
import {
  footerTextVariants,
  largeTextVariants,
  maxTextScale,
  textTones,
  textVariants,
  typeFaces,
  type TextVariant,
} from "./type-scale";

/** A rendered host element as `screen.toJSON()` returns it. */
export type RenderedNode = {
  children: (RenderedNode | string)[] | null;
  props: Record<string, unknown>;
  type: string;
};

type Rendered = RenderedNode | RenderedNode[] | null;

/** Rule 3: only titles, figures and destacado stand on 100, 200 or 500. */
const colouredGrounds = new Set<string>([rosa[100], rosa[200], rosa[300], rosa[400], rosa[500]]);
const tones = new Set<string>(Object.values(textTones));
const initialsVariants = new Set<TextVariant>(["pastilla", "destacado"]);
/** White text belongs on 600 and 500; ink never sits on them (contrast). */
const darkGrounds = new Set<string>([rosa[500], rosa[600]]);
const lightGrounds = new Set<string>([
  rosa[50],
  rosa[100],
  rosa[200],
  brand.crema,
  brand.white,
  "#FFFFFF",
]);
const fieldFaces = new Set<string>([typeFaces.regular, typeFaces.italic]);

function textOf(node: RenderedNode): string {
  return (node.children ?? [])
    .map((child) => (typeof child === "string" ? child : textOf(child)))
    .join("")
    .trim()
    .slice(0, 60);
}

function sameList(left: readonly unknown[] | undefined, right: readonly unknown[] | undefined) {
  return JSON.stringify(left ?? []) === JSON.stringify(right ?? []);
}

function variantOf(style: TextStyle): TextVariant | undefined {
  const decoration =
    style.textDecorationLine === "line-through" ? undefined : style.textDecorationLine;
  return (Object.keys(textVariants) as TextVariant[]).find((name) => {
    const variant: TextStyle = textVariants[name];
    return (
      variant.fontFamily === style.fontFamily &&
      variant.fontSize === style.fontSize &&
      variant.lineHeight === style.lineHeight &&
      (variant.letterSpacing ?? 0) === (style.letterSpacing ?? 0) &&
      variant.textTransform === style.textTransform &&
      variant.textDecorationLine === decoration &&
      sameList(variant.fontVariant, style.fontVariant) &&
      style.fontWeight === undefined &&
      style.fontStyle === undefined
    );
  });
}

function describeSize(style: TextStyle) {
  return `${style.fontFamily ?? "–"} ${style.fontSize ?? "–"}/${style.lineHeight ?? "–"}`;
}

function scaleCap(node: RenderedNode) {
  const cap = node.props.maxFontSizeMultiplier;
  return node.props.allowFontScaling === false || (typeof cap === "number" && cap <= maxTextScale);
}

function auditText(node: RenderedNode, ground: string | undefined, opacity: number): string[] {
  const style = StyleSheet.flatten(node.props.style as TextStyle) ?? {};
  const label = `«${textOf(node)}»`;
  const variant = variantOf(style);
  // A text off the scale is a raw style: one line says enough.
  if (variant === undefined) return [`${label} is off the scale (${describeSize(style)})`];
  const problems: string[] = [];
  if (!tones.has(String(style.color))) problems.push(`${label} has colour ${String(style.color)}`);
  if (!scaleCap(node)) problems.push(`${label} grows past 1.3 times with the phone's text size`);
  // Only initials inside a fixed disc may stay put (rule 9).
  if (node.props.allowFontScaling === false && !initialsVariants.has(variant)) {
    problems.push(`${label} does not grow with the phone's text size`);
  }
  if (opacity > 0 && opacity < 1) problems.push(`${label} is transparent (${opacity})`);
  if (ground !== undefined) {
    if (style.color === textTones.onDark && lightGrounds.has(ground)) {
      problems.push(`${label} is white on ${ground}`);
    }
    if (style.color === textTones.ink && darkGrounds.has(ground)) {
      problems.push(`${label} is ink on ${ground}`);
    }
    // Follow-up 292: Destructivo reads only on white and the light grounds.
    if (style.color === textTones.destructivo && darkGrounds.has(ground)) {
      problems.push(`${label} is destructivo on ${ground}`);
    }
  }
  // Follow-up 293: the footer's styles and tone go together, on Fondo only.
  const footer = footerTextVariants.includes(variant);
  const footerTone = style.color === textTones["texto-pie"];
  if (footer && !footerTone) problems.push(`${label} is ${variant} outside texto-pie`);
  if (footerTone && !footer) problems.push(`${label} is texto-pie outside the footer styles`);
  if (footer && ground !== undefined && ground !== rosa[100]) {
    problems.push(`${label} is ${variant} on ${ground}`);
  }
  if (
    ground !== undefined &&
    colouredGrounds.has(ground) &&
    !largeTextVariants.includes(variant) &&
    !(footer && ground === rosa[100])
  ) {
    problems.push(`${label} is small text (${variant}) on ${ground}`);
  }
  return problems;
}

function auditField(node: RenderedNode): string[] {
  const style = StyleSheet.flatten(node.props.style as TextStyle) ?? {};
  const label = `field «${String(node.props.placeholder ?? node.props.accessibilityLabel ?? "")}»`;
  const figure = textVariants["cifra-grande"];
  const face =
    (fieldFaces.has(String(style.fontFamily)) && style.fontSize === textVariants.cuerpo.fontSize) ||
    (style.fontFamily === figure.fontFamily && style.fontSize === figure.fontSize);
  const onScale =
    face &&
    style.fontWeight === undefined &&
    tones.has(String(style.color)) &&
    tones.has(String(node.props.placeholderTextColor)) &&
    scaleCap(node);
  if (!onScale) {
    return [`${label} is off the scale (${style.fontFamily ?? "–"} ${style.fontSize ?? "–"})`];
  }
  // Rule 7: italic is for the example text only.
  const typed = typeof node.props.value === "string" && node.props.value.length > 0;
  return typed && style.fontFamily === typeFaces.italic
    ? [`${label} is italic with text in it`]
    : [];
}

function walk(node: RenderedNode | string, ground: string | undefined, opacity: number): string[] {
  if (typeof node === "string") return [];
  const style = StyleSheet.flatten(node.props.style as TextStyle) ?? {};
  const own = typeof style.opacity === "number" ? style.opacity : 1;
  const nextOpacity = opacity * own;
  const nextGround = typeof style.backgroundColor === "string" ? style.backgroundColor : ground;
  const here =
    node.type === "Text"
      ? auditText(node, nextGround, nextOpacity)
      : node.type === "TextInput"
        ? auditField(node)
        : [];
  return [
    ...here,
    ...(node.children ?? []).flatMap((child) => walk(child, nextGround, nextOpacity)),
  ];
}

/**
 * Every rendered text that leaves the Rosa Emma type scale (follow-up 285):
 * a face, size, line height or spacing outside the variants, a colour other
 * than ink or white, no 1.3 cap on the phone's text size, transparency, or
 * small text straight on 100, 200 or 500. Pass `screen.toJSON()`.
 */
export function offScaleTexts(rendered: Rendered): string[] {
  if (rendered === null) return [];
  const roots = Array.isArray(rendered) ? rendered : [rendered];
  return roots.flatMap((root) => walk(root, undefined, 1));
}
