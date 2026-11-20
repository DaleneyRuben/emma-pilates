import { readFileSync } from "node:fs";
import { join } from "node:path";
import { typeScale } from "./components/ui/typography";

// Follow-up 285: the type scale is closed. `@theme` holds exactly these
// sizes, two families, and no weight, leading or tracking tokens, so a new
// size cannot slip in without changing this list on purpose.
const css = readFileSync(join(__dirname, "index.css"), "utf8");
const theme = /@theme\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? "";

const declarations = (prefix: RegExp) =>
  [...theme.matchAll(/^\s*(--[\w*-]+):\s*([^;]+);/gm)]
    .filter(([, name]) => prefix.test(name!))
    .map(([, name, value]) => `${name}: ${value!.trim()}`);

describe("the admin web theme", () => {
  it("defines exactly the thirteen text sizes of the scale", () => {
    expect(declarations(/^--text-/)).toEqual([
      "--text-*: initial",
      "--text-titulo-pagina: 34px",
      "--text-titulo-pagina--line-height: 1.1",
      "--text-titulo-seccion: 28px",
      "--text-titulo-seccion--line-height: 1.15",
      "--text-titulo-bloque: 22px",
      "--text-titulo-bloque--line-height: 1.2",
      "--text-cifra-grande: 34px",
      "--text-cifra-grande--line-height: 1.1",
      "--text-cifra: 24px",
      "--text-cifra--line-height: 1.2",
      "--text-destacado: 19px",
      "--text-destacado--line-height: 1.3",
      "--text-titulo-fila: 16px",
      "--text-titulo-fila--line-height: 1.35",
      "--text-boton: 16px",
      "--text-boton--line-height: 1",
      "--text-cuerpo: 15px",
      "--text-cuerpo--line-height: 1.5",
      "--text-compacto: 14px",
      "--text-compacto--line-height: 1.45",
      "--text-secundario: 13px",
      "--text-secundario--line-height: 1.45",
      "--text-etiqueta: 12px",
      "--text-etiqueta--line-height: 1.2",
      "--text-etiqueta--letter-spacing: 0.12em",
      "--text-pastilla: 12px",
      "--text-pastilla--line-height: 1.2",
    ]);
  });

  it("keeps two families and no weight, leading or tracking tokens", () => {
    expect(declarations(/^--(font|leading|tracking)/)).toEqual([
      "--font-*: initial",
      '--font-serif: "Lora", ui-serif, Georgia, serif',
      '--font-sans: "Work Sans", ui-sans-serif, system-ui, sans-serif',
      "--font-weight-*: initial",
      "--leading-*: initial",
      "--tracking-*: initial",
    ]);
  });

  it("gives every style of the scale its tipo class", () => {
    const utilities = [...css.matchAll(/@utility (tipo-[\w-]+)/g)].map(
      ([, name]) => name,
    );
    expect(utilities).toEqual(
      Object.keys(typeScale).map((style) => `tipo-${style}`),
    );
  });

  it("gives each tipo class the family and weight of its style", () => {
    for (const [style, { family, weight }] of Object.entries(typeScale)) {
      const block =
        new RegExp(`@utility tipo-${style} \\{([\\s\\S]*?)\\n\\}`).exec(
          css,
        )?.[1] ?? "";
      expect([
        style,
        /font-family: var\(--font-(\w+)\)/.exec(block)?.[1],
      ]).toEqual([style, family === "Lora" ? "serif" : "sans"]);
      expect([style, /font-weight: (\d+)/.exec(block)?.[1]]).toEqual([
        style,
        String(weight),
      ]);
    }
  });

  it("leaves the family and weight of headings to their tipo class", () => {
    const headings = /h1,\s*h2,\s*h3\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(headings).not.toMatch(/font-(family|weight)/);
  });
});
