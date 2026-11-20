import { RuleTester } from "eslint";
import tseslint from "typescript-eslint";
import rule from "./no-raw-typography.js";

const tester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

const jsx = (className) => `<p className="${className}">Hola</p>;`;
const invalid = (code, token) => ({
  code,
  errors: [{ messageId: "raw", data: { token } }],
});

tester.run("no-raw-typography", rule, {
  valid: [
    jsx("tipo-cuerpo text-texto"),
    jsx("tipo-etiqueta md:tipo-secundario"),
    jsx("bg-primario text-sobre-primario text-center truncate"),
    jsx("text-left whitespace-nowrap text-balance text-pretty"),
    jsx("opacity-0 group-hover:opacity-100 transition-opacity"),
    jsx("no-underline"),
    jsx("line-through"),
    "<div style={{ height: 40, top: 0 }} />;",
    "const options = { underline: true };",
    'cn("tipo-boton", busy && "relative")',
    "const copy = 'La letra font de la tarjeta';",
    'const message = "Escribe en mayúsculas si quieres";',
  ],
  invalid: [
    invalid(jsx("text-[24px]"), "text-[24px]"),
    invalid(jsx("text-cuerpo"), "text-cuerpo"),
    invalid(jsx("text-sm"), "text-sm"),
    invalid(jsx("lg:text-2xl"), "lg:text-2xl"),
    invalid(jsx("font-serif"), "font-serif"),
    invalid(jsx("font-bold"), "font-bold"),
    invalid(jsx("disabled:font-semibold"), "disabled:font-semibold"),
    invalid(jsx("leading-tight"), "leading-tight"),
    invalid(jsx("leading-[1.1]"), "leading-[1.1]"),
    invalid(jsx("tracking-[0.14em]"), "tracking-[0.14em]"),
    invalid(jsx("uppercase"), "uppercase"),
    invalid(jsx("opacity-70"), "opacity-70"),
    invalid(jsx("disabled:opacity-60"), "disabled:opacity-60"),
    invalid(jsx("opacity-[0.55]"), "opacity-[0.55]"),
    invalid(jsx("text-texto/70"), "text-texto/70"),
    invalid(jsx("text-rosa-600"), "text-rosa-600"),
    invalid(jsx("text-primario"), "text-primario"),
    invalid(jsx("text-blanco"), "text-blanco"),
    invalid(
      jsx("hover:text-primario-presionado"),
      "hover:text-primario-presionado",
    ),
    invalid(jsx("hover:text-texto"), "hover:text-texto"),
    invalid(jsx("placeholder:text-texto"), "placeholder:text-texto"),
    invalid(jsx("underline"), "underline"),
    invalid(jsx("hover:decoration-2"), "hover:decoration-2"),
    invalid(jsx("underline-offset-[3px]"), "underline-offset-[3px]"),
    invalid('cn("tipo-cuerpo", open && "font-medium")', "font-medium"),
    invalid("const labelClass = `px-2 ${a} text-nota`;", "text-nota"),
    invalid(
      'cva("x", { variants: { s: { sm: "text-celda" } } })',
      "text-celda",
    ),
    invalid(jsx("[font-size:11px]"), "[font-size:11px]"),
    invalid(jsx("md:[font-weight:300]"), "md:[font-weight:300]"),
    invalid(jsx("[color:red]"), "[color:red]"),
    invalid(jsx("[letter-spacing:0.2em]"), "[letter-spacing:0.2em]"),
    invalid(jsx("normal-case"), "normal-case"),
    invalid(jsx("italic"), "italic"),
    invalid('cn("tipo-cuerpo", { uppercase: open })', "uppercase"),
    {
      code: "<p style={{ fontSize: 11, color: x }}>Hola</p>;",
      errors: [
        { messageId: "style", data: { property: "fontSize" } },
        { messageId: "style", data: { property: "color" } },
      ],
    },
  ],
});
