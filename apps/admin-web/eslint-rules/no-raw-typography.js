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

// An arbitrary property sets typography as well as any utility does.
const ARBITRARY =
  /^\[(font|font-size|font-weight|font-family|font-style|line-height|letter-spacing|text-transform|text-decoration[\w-]*|color|opacity)\s*:/;

// Inline styles that would set typography or a text colour.
const STYLE_PROPERTIES = new Set([
  "fontSize",
  "fontFamily",
  "fontWeight",
  "fontStyle",
  "lineHeight",
  "letterSpacing",
  "textTransform",
  "textDecoration",
  "textDecorationLine",
  "color",
  "opacity",
]);

const CLASS_HELPERS = new Set(["cn", "clsx", "cx", "cva", "twMerge"]);

function isRaw(token) {
  const utility = utilityOf(token);
  if (ARBITRARY.test(utility)) return true;
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
    /^(uppercase|lowercase|capitalize|normal-case)$/.test(utility) ||
    /^(italic|not-italic)$/.test(utility) ||
    /^(underline|overline)$/.test(utility) ||
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
      style:
        "«{{property}}» in a style sets typography by hand; use a tipo-* class (follow-up 285).",
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
      // `cn("…", { uppercase: open })`: the keys of a class helper's object.
      "CallExpression > ObjectExpression > Property"(node) {
        const call = node.parent.parent;
        const helper = call.callee.type === "Identifier" && call.callee.name;
        if (!CLASS_HELPERS.has(helper)) return;
        if (node.key.type === "Identifier" && !node.computed) {
          check(context, node.key, node.key.name);
        }
      },
      "JSXAttribute[name.name='style'] ObjectExpression > Property"(node) {
        const name =
          node.key.type === "Identifier" ? node.key.name : node.key.value;
        if (STYLE_PROPERTIES.has(name)) {
          context.report({
            node: node.key,
            messageId: "style",
            data: { property: name },
          });
        }
      },
    };
  },
};
