import { findTypeProblems, type MeasuredText } from "./type-audit";

const INK = "rgb(147, 97, 93)";
const WHITE_BG = "rgb(255, 251, 251)";

const text = (overrides: Partial<MeasuredText>): MeasuredText => ({
  text: "Hola",
  family: '"Work Sans", ui-sans-serif',
  size: 15,
  weight: 400,
  color: INK,
  background: WHITE_BG,
  opacity: 1,
  upper: false,
  boxed: false,
  underlined: false,
  ...overrides,
});

const problems = (measured: Partial<MeasuredText>, narrow = false) =>
  findTypeProblems([text(measured)], narrow)[0]?.problems ?? [];

describe("the type audit (follow-up 285, revisar.cjs)", () => {
  it("accepts every style of the scale on white", () => {
    const scale: Partial<MeasuredText>[] = [
      { family: "Lora", size: 34, weight: 500 },
      { family: "Lora", size: 28, weight: 500 },
      { family: "Lora", size: 22, weight: 500 },
      { family: "Lora", size: 24, weight: 500 },
      { size: 19, weight: 700 },
      { size: 16, weight: 600 },
      { size: 16, weight: 700, boxed: true },
      { size: 14, weight: 700, boxed: true },
      { size: 15, weight: 400 },
      { size: 14, weight: 400 },
      { size: 14, weight: 600 },
      { size: 13, weight: 400 },
      { size: 12, weight: 700, upper: true },
      { size: 12, weight: 700 },
      { size: 14, weight: 700, underlined: true },
      { size: 15, weight: 700, underlined: true },
      { size: 13, weight: 700, underlined: true },
    ];
    expect(findTypeProblems(scale.map(text), false)).toEqual([]);
  });

  it("uses the narrow title and figure sizes at 420 px", () => {
    expect(problems({ family: "Lora", size: 30, weight: 500 }, true)).toEqual(
      [],
    );
    expect(problems({ family: "Lora", size: 28, weight: 500 }, true)).toEqual(
      [],
    );
    expect(problems({ family: "Lora", size: 34, weight: 500 }, true)).toEqual([
      "off the scale (Lora 34 500)",
    ]);
  });

  it("flags a size, weight or family off the scale", () => {
    expect(problems({ size: 17 })).toEqual([
      "off the scale (Work Sans 17 400)",
    ]);
    expect(problems({ size: 15, weight: 500 })).toEqual([
      "off the scale (Work Sans 15 500)",
    ]);
    expect(problems({ family: "Lora", size: 15, weight: 400 })).toEqual([
      "off the scale (Lora 15 400)",
    ]);
    expect(problems({ size: 16, weight: 700 })).toEqual([
      "off the scale (Work Sans 16 700)",
    ]);
  });

  it("flags text under 12 px", () => {
    expect(problems({ size: 11, weight: 700, upper: true })).toEqual([
      "off the scale (Work Sans 11 700)",
      "under 12 px",
      "uppercase outside etiqueta",
    ]);
  });

  it("flags small text on 100, 200 or 500, but not large text", () => {
    for (const background of [
      "rgb(249, 231, 223)",
      "rgb(231, 204, 191)",
      "rgb(183, 131, 128)",
    ]) {
      expect(problems({ size: 13, background })).toEqual([
        `small text on ${background}`,
      ]);
      expect(problems({ size: 19, weight: 700, background })).toEqual([]);
    }
  });

  it("flags opacity, colours other than ink and white, and stray capitals", () => {
    expect(problems({ opacity: 0.7 })).toEqual(["opacity 0.70"]);
    expect(problems({ color: "rgb(183, 131, 128)" })).toEqual([
      "colour rgb(183, 131, 128)",
    ]);
    expect(problems({ size: 12, weight: 700, upper: true })).toEqual([]);
    expect(problems({ upper: true })).toEqual(["uppercase outside etiqueta"]);
  });

  it("flags an underline that is not bold", () => {
    expect(problems({ underlined: true })).toEqual([
      "underlined but not bold (links are 700)",
    ]);
  });
});
