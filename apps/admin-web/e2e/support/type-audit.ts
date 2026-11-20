import type { Page } from "@playwright/test";
import {
  inlineLinkSizes,
  typeScale,
  type TypeStyle,
} from "../../src/components/ui/typography";

/**
 * Follow-up 285's checker for the running admin web: the rules of
 * design/v3/sistema/revisor/revisar.cjs (which measures the boards), applied
 * to every visible text node of a page.
 */

/** One visible text node, measured in the browser (see `collectTexts`). */
export type MeasuredText = {
  text: string;
  family: string;
  size: number;
  weight: number;
  color: string;
  background: string;
  opacity: number;
  upper: boolean;
  boxed: boolean;
  underlined: boolean;
};

const INK = "rgb(147, 97, 93)";
const WHITES = new Set(["rgb(255, 251, 251)", "rgb(255, 255, 255)"]);
// White, 50, crema and 600: the only grounds small text may sit on.
const SMALL_TEXT_GROUNDS = new Set([
  "rgb(255, 251, 251)",
  "rgb(255, 255, 255)",
  "rgb(254, 246, 242)",
  "rgb(249, 244, 242)",
  INK,
]);

type Entry = [name: string, style: TypeStyle];
const styles = Object.entries(typeScale) as Entry[];

function sizesOf([name, style]: Entry, narrow: boolean): readonly number[] {
  if (name === "enlace-en-linea") return inlineLinkSizes;
  return [narrow && style.narrow !== undefined ? style.narrow : style.size];
}

function matches(text: MeasuredText, family: string, narrow: boolean) {
  return (entry: Entry) => {
    const [, style] = entry;
    if (style.family !== family || style.weight !== text.weight) return false;
    if (!sizesOf(entry, narrow).some((s) => Math.abs(s - text.size) < 0.5)) {
      return false;
    }
    switch (style.mark) {
      case "underline":
        return text.underlined;
      case "upper":
        return text.upper;
      case "lower":
        return !text.upper;
      case "box":
        return text.boxed && !text.underlined;
      default:
        return true;
    }
  };
}

export function findTypeProblems(
  texts: MeasuredText[],
  narrow: boolean,
): { text: string; problems: string[] }[] {
  return texts.flatMap((text) => {
    const family = text.family.includes("Lora") ? "Lora" : "Work Sans";
    const match = styles.find(matches(text, family, narrow));
    const problems: string[] = [];
    if (!match) {
      problems.push(`off the scale (${family} ${text.size} ${text.weight})`);
    }
    if (text.size < 12) problems.push("under 12 px");
    if (match && !match[1].large && !SMALL_TEXT_GROUNDS.has(text.background)) {
      problems.push(`small text on ${text.background}`);
    }
    if (text.color !== INK && !WHITES.has(text.color)) {
      problems.push(`colour ${text.color}`);
    }
    if (text.opacity < 0.99) {
      problems.push(`opacity ${text.opacity.toFixed(2)}`);
    }
    if (text.underlined && text.weight !== 700) {
      problems.push("underlined but not bold (links are 700)");
    }
    if (text.upper && match?.[0] !== "etiqueta") {
      problems.push("uppercase outside etiqueta");
    }
    return problems.length ? [{ text: text.text, problems }] : [];
  });
}

/**
 * Measures every visible text node of the page as revisar.cjs does: the
 * computed family, size, weight, colour, accumulated opacity, case, the
 * first painted background behind it, whether it sits in a box (a button
 * or a rounded filled or outlined shape) and whether it is underlined.
 */
export function collectTexts(page: Page): Promise<MeasuredText[]> {
  return page.evaluate(() => {
    const clear = (c: string) =>
      c === "rgba(0, 0, 0, 0)" || c === "transparent";
    // The painted ground: translucent layers (a row's hover fill, a scrim)
    // are blended over what is under them, as the eye sees them.
    const backgroundOf = (el: Element) => {
      const layers: number[][] = [];
      for (let e: Element | null = el; e; e = e.parentElement) {
        const c = getComputedStyle(e).backgroundColor;
        if (!c || clear(c)) continue;
        const [r = 0, g = 0, b = 0, a = 1] = (c.match(/[\d.]+/g) ?? []).map(
          Number,
        );
        layers.push([r, g, b, a]);
        if (a >= 1) break;
      }
      let ground = [255, 255, 255];
      for (const [r = 0, g = 0, b = 0, a = 1] of layers.reverse()) {
        ground = [r, g, b].map((v, i) =>
          Math.round(v * a + ground[i]! * (1 - a)),
        );
      }
      return `rgb(${ground.join(", ")})`;
    };
    const opacityOf = (el: Element) => {
      let o = 1;
      for (let e: Element | null = el; e; e = e.parentElement) {
        o *= Number(getComputedStyle(e).opacity);
      }
      return o;
    };
    const boxed = (el: Element) => {
      let e: Element | null = el;
      for (let k = 0; e && k < 3; e = e.parentElement, k++) {
        const s = getComputedStyle(e);
        if (e.tagName === "BUTTON") return true;
        const shaped =
          s.boxShadow !== "none" ||
          parseFloat(s.borderTopWidth) > 0 ||
          !clear(s.backgroundColor);
        if (parseFloat(s.borderRadius) > 0 && shaped) return true;
      }
      return false;
    };
    const underlined = (el: Element) => {
      let e: Element | null = el;
      for (let k = 0; e && k < 6; e = e.parentElement, k++) {
        if (getComputedStyle(e).textDecorationLine.includes("underline")) {
          return true;
        }
      }
      return false;
    };

    const out: MeasuredText[] = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
    );
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const text = node.textContent?.trim() ?? "";
      const el = node.parentElement;
      if (!text || !el || el.closest("script,style,svg,noscript")) continue;
      const cs = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      // Skips hidden text and the 1 px screen-reader-only text.
      if (rect.width <= 1 || rect.height <= 1) continue;
      if (cs.visibility === "hidden" || cs.display === "none") continue;
      // Text drawn fully transparent at rest (a slot's «+ 07:00» before
      // hover) is not seen.
      if (opacityOf(el) === 0) continue;
      out.push({
        text: text.slice(0, 50),
        family: cs.fontFamily,
        size: parseFloat(cs.fontSize),
        weight: Number(cs.fontWeight),
        color: cs.color,
        background: backgroundOf(el),
        opacity: opacityOf(el),
        upper: cs.textTransform === "uppercase",
        boxed: boxed(el),
        underlined: underlined(el),
      });
    }
    return out;
  });
}
