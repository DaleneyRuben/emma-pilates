// Clipped-text checker for design/v3 boards (follow-up 285): flags text whose box falls outside an ancestor that clips (overflow hidden/clip/auto),
// and text truncated with an ellipsis. Usage: node cortes.cjs <width> <height> <file.html>...
const { chromium } = require(require('path').resolve(__dirname, '../../../../apps/admin-web/node_modules/@playwright/test'));
const path = require('path');
const [width, height, ...files] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); let bad = 0, total = 0;
  for (const f of files) {
    const p = await b.newPage({ viewport: { width: +width, height: +height } });
    await p.goto('file://' + path.resolve(f)); await p.waitForTimeout(1200);
    const found = await p.evaluate(() => {
      const out = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      while (w.nextNode()) {
        const t = w.currentNode; const txt = t.textContent.trim(); if (!txt) continue;
        const el = t.parentElement; if (el.closest('script,style,svg')) continue;
        const r = document.createRange(); r.selectNodeContents(t); const rects = [...r.getClientRects()]; if (!rects.length) continue;
        const box = { l: Math.min(...rects.map(x => x.left)), r: Math.max(...rects.map(x => x.right)), t: Math.min(...rects.map(x => x.top)), b: Math.max(...rects.map(x => x.bottom)) };
        if (box.r - box.l < 1) continue;
        let why = null;
        if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).textOverflow === 'ellipsis') why = 'cortado con «…»';
        for (let a = el; a && a !== document.body && !why; a = a.parentElement) {
          const cs = getComputedStyle(a); if (!/(hidden|clip|auto|scroll)/.test(cs.overflow + cs.overflowX + cs.overflowY)) continue;
          const ar = a.getBoundingClientRect();
          // ignore the outer device frame (the screen itself clips scrolled content by design)
          if (ar.width >= innerWidth - 2 && ar.height >= 600) continue;
          if (box.b > ar.bottom + 1 || box.t < ar.top - 1 || box.r > ar.right + 1 || box.l < ar.left - 1) why = 'se sale de su caja';
        }
        if (why) out.push(`«${txt.slice(0, 40)}» ${why}`);
      }
      return out;
    });
    total++; if (found.length) { bad++; console.log(path.basename(f) + ': ' + found.join(' | ')); }
    await p.close();
  }
  console.log(`\n${total} archivo(s), ${bad} con textos cortados`); await b.close(); process.exit(bad ? 1 : 0);
})();
