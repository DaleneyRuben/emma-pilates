/**
 * Follow-up 285: every text takes its family, size, weight, line-height,
 * letter-spacing and case from one `tipo-*` class (src/index.css), and its
 * colour is the ink (`text-texto`) or white on 600 (`text-sobre-primario`).
 *
 * The rule reads every string and template part as a list of classes and
 * reports the utilities that would set typography by hand: sizes, families,
 * weights, leading, tracking, case, underlines, opacity, and any text colour
 * other than those two (aliases, hover colours, an alpha suffix).
 */
const TEXT_ALLOWED = new Set([
  "texto",
  "sobre-primario",
  "left",
  "center",
  "right",
  "justify",
  "start",
  "end",
  "wrap",
  "nowrap",
  "balance",
  "pretty",
  "ellipsis",
  "clip",
]);

// Show and hide transitions use full opacity steps, never a dimmed text.
const OPACITY_ALLOWED = new Set(["opacity-0", "opacity-100"]);

/** The utility without its variants (`md:`, `hover:`) or `!` marks. */
function utilityOf(token) {
  let depth = 0;
  let start = 0;
  for (let i = 0; i < token.length; i += 1) {
    const c = token[i];
    if (c === "[" || c === "(") depth += 1;
    else if (c === "]" || c === ")") depth -= 1;
    else if (c === ":" && depth === 0) start = i + 1;
  }
  return token.slice(start).replace(/^!|!$/g, "");
}

function isRaw(token) {
  const utility = utilityOf(token);
  const variants = token.slice(0, token.length - utility.length);
  if (utility.startsWith("text-")) {
    const rest = utility.slice(5);
    // A hover, focus or placeholder colour is a colour change by hand.
    if (/(hover|focus|active|placeholder|group-hover):/.test(variants)) {
      return true;
    }
    return !TEXT_ALLOWED.has(rest);
  }
  if (/^opacity-/.test(utility)) return !OPACITY_ALLOWED.has(utility);
  return (
    /^font-/.test(utility) ||
    /^(leading|tracking)-/.test(utility) ||
    /^(uppercase|lowercase|capitalize)$/.test(utility) ||
    /^(underline|overline|line-through)$/.test(utility) ||
    /^(underline-offset|decoration)-/.test(utility)
  );
}

function check(context, node, value) {
  for (const token of value.split(/\s+/)) {
    if (token && /^[!\w[(-]/.test(token) && isRaw(token)) {
      context.report({ node, messageId: "raw", data: { token } });
    }
  }
}

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Typography comes from a tipo-* class (follow-up 285), never from raw utilities.",
    },
    messages: {
      raw: "«{{token}}» sets typography by hand; use a tipo-* class (follow-up 285) and text-texto or text-sobre-primario.",
    },
    schema: [],
  },
  create(context) {
    return {
      Literal(node) {
        if (typeof node.value === "string") check(context, node, node.value);
      },
      TemplateElement(node) {
        check(context, node, node.value.cooked ?? node.value.raw);
      },
    };
  },
};
