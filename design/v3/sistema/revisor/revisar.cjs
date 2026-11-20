// Type-scale checker for design/v3 boards (docs/design/prompts/followups/285-rosa-emma-type-scale.md). Usage: node revisar.cjs <web|app> <width> <file.html>...
const { chromium } = require(require('path').resolve(__dirname, '../../../../apps/admin-web/node_modules/@playwright/test'));
const [surface, width, ...files] = process.argv.slice(2);
const web = surface === 'web', narrow = +width <= 420;
const L = 'Lora', S = 'Work Sans';
const STYLES = [
  ['titulo-pagina', L, web ? (narrow ? 30 : 34) : 30, 500], ['titulo-seccion', L, web ? 28 : 24, 500], ['titulo-bloque', L, 22, 500],
  ['cifra-grande', L, web && narrow ? 28 : 34, 500], ['cifra', L, 24, 500], ['destacado', S, 19, 700], ['titulo-fila', S, 16, 600],
  ['boton', S, 16, 700, 'box'], ['boton-chico', S, 14, 700, 'box'], ['cuerpo', S, 15, 400], ['compacto', S, 14, 400], ['compacto-600', S, 14, 600],
  ['secundario', S, 13, 400], ['etiqueta', S, 12, 700, 'up'], ['pastilla', S, 12, 700, 'low'],
  ['enlace', S, 14, 700, 'u'], ['enlace-cuerpo', S, 15, 700, 'u'], ['enlace-secundario', S, 13, 700, 'u'],
];
const LARGE = new Set(['titulo-pagina', 'titulo-seccion', 'titulo-bloque', 'cifra-grande', 'cifra', 'destacado']);
const INK = 'rgb(147, 97, 93)', WHITE = 'rgb(255, 251, 251)';
const SMALL_OK_BG = new Set(['rgb(255, 251, 251)', 'rgb(254, 246, 242)', 'rgb(147, 97, 93)', 'rgb(249, 244, 242)', 'rgb(255, 255, 255)']);
(async () => {
  const b = await chromium.launch(); let total = 0, bad = 0; const counts = {};
  for (const f of files) {
    const p = await b.newPage({ viewport: { width: +width, height: 900 } });
    await p.goto('file://' + require('path').resolve(f)); await p.waitForTimeout(1500);
    const nodes = await p.evaluate(() => {
      const out = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') return c; } return 'rgb(255, 255, 255)'; };
      const opOf = (el) => { let o = 1; for (let e = el; e; e = e.parentElement) o *= +getComputedStyle(e).opacity; return o; };
      while (w.nextNode()) {
        const t = w.currentNode; const txt = t.textContent.trim(); if (!txt) continue;
        const el = t.parentElement; const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
        if (r.width === 0 || cs.visibility === 'hidden' || cs.display === 'none' || el.closest('script,style,svg')) continue;
        out.push({ txt: txt.slice(0, 50), fam: cs.fontFamily, size: parseFloat(cs.fontSize), weight: +cs.fontWeight, color: cs.color, bg: bgOf(el), op: opOf(el), upper: cs.textTransform === 'uppercase', boxed: (() => { for (let e = el, k = 0; e && k < 3; e = e.parentElement, k++) { const s = getComputedStyle(e); if (e.tagName === 'BUTTON' || (parseFloat(s.borderRadius) > 0 && (s.boxShadow !== 'none' || parseFloat(s.borderTopWidth) > 0 || (s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.backgroundColor !== 'transparent')))) return true; } return false; })(), under: [...Array(6)].reduce((a, _, i) => { let e = el; for (let k = 0; k < i && e; k++) e = e.parentElement; return a || (e && getComputedStyle(e).textDecorationLine.includes('underline')); }, false) });
      }
      return out;
    });
    for (const n of nodes) {
      total++; const fam = n.fam.includes('Lora') ? L : S;
      const m = STYLES.find(([, F, sz, wt, k]) => F === fam && Math.abs(sz - n.size) < 0.5 && wt === n.weight && (!k || (k === 'u' && n.under) || (k === 'up' && n.upper) || (k === 'low' && !n.upper) || (k === 'box' && n.boxed && !n.under)));
      const probs = [];
      if (!m) probs.push(`fuera de escala (${fam} ${n.size} ${n.weight})`);
      if (n.size < 12) probs.push('menor a 12 px');
      if (m && !LARGE.has(m[0]) && !SMALL_OK_BG.has(n.bg)) probs.push(`texto chico sobre ${n.bg}`);
      if (n.color !== INK && n.color !== WHITE && n.color !== 'rgb(255, 255, 255)') probs.push(`color ${n.color}`);
      if (n.op < 0.99) probs.push(`transparencia ${n.op.toFixed(2)}`);
      if (n.under && n.weight !== 700) probs.push('subrayado sin negrita (los enlaces van en 700)');
      if (n.upper && !(m && m[0] === 'etiqueta')) probs.push('mayúsculas fuera de etiqueta');
      if (probs.length) { bad++; console.log(`${require('path').basename(f)} · «${n.txt}» · ${probs.join('; ')}`); }
      if (m) counts[m[0]] = (counts[m[0]] || 0) + 1;
    }
    await p.close();
  }
  console.log(`\n${files.length} archivo(s), ${total} textos, ${bad} con problemas`); console.log(JSON.stringify(counts));
  await b.close(); process.exit(bad ? 1 : 0);
})();
