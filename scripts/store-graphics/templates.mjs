// The HTML of the store graphics in «Rosa Emma», drawn on a 540-wide grid
// and scaled to each store size with one unit (`u` = width / 540), so every
// size keeps the same proportions. Colors are the apps' Rosa Emma scale
// (packages/mobile-core/src/ui/tokens.ts). Small text sits only on white,
// crema, rosa 50 or rosa 600.
const rosa = { 50: "#FEF6F2", 100: "#F9E7DF", 200: "#E7CCBF", 300: "#DAB9AB", 600: "#93615D", white: "#FFFBFB", crema: "#F9F4F2" };
const shadow = "rgba(147,97,93,";

const escape = (text) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const fontFaces = (fonts) => `
  @font-face { font-family: Lora; font-weight: 500; src: url(${fonts.lora("500Medium")}); }
  @font-face { font-family: Work; font-weight: 400; src: url(${fonts.work("400Regular")}); }
  @font-face { font-family: Work; font-weight: 600; src: url(${fonts.work("600SemiBold")}); }`;

// A phone sits narrower than an iPad. The iPad Simulator ignores the 9:41
// status bar override, so its status bar is cropped (`cropTop`, of the height).
const frames = {
  phone: { left: 96, width: 348, bezel: 10, radius: 58, aspect: 2622 / 1206 },
  tablet: { left: 34, width: 448, bezel: 12, radius: 40, cropTop: 0.026, aspect: 2420 / 1668 },
};

// Screenshots use «Tono 1» (owner, 2026-11-25): a crema ground so the pink
// app and its rosa 600 frame stand out, with rosa kept for the accents (the
// label on a rosa 600 pill, the Lora title and the frame).
export function shotHtml({ eyebrow, title, screen, width, device, fonts, phone }) {
  const u = width / 540;
  // The frame sits a fixed gap under the title, so a three-line title pushes it
  // down instead of running into it. A phone shot may scroll its screen
  // (`scrollTop`, of the screen height) so a list at the bottom shows.
  const f = device === "phone" ? { ...frames.phone, ...phone } : frames[device];
  const scrollTop = f.scrollTop ?? 0;
  const px = (value) => `${(value * u).toFixed(2)}px`;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
  ${fontFaces(fonts)}
  html, body { margin: 0; }
  body { width: 100vw; height: 100vh; overflow: hidden; background: ${rosa.crema}; color: ${rosa[600]}; font-family: Work, sans-serif; position: relative; }
  .copy { padding: ${px(64)} ${px(48)} 0; display: flex; flex-direction: column; align-items: flex-start; gap: ${px(20)}; }
  .label { padding: ${px(8)} ${px(16)}; border-radius: ${px(999)}; background: ${rosa[600]}; font-size: ${px(12)}; font-weight: 600; letter-spacing: 0.22em; text-transform: uppercase; color: ${rosa.white}; }
  h1 { margin: 0; font-family: Lora, serif; font-weight: 500; font-size: ${px(44)}; line-height: 1.08; letter-spacing: -0.01em; max-width: ${px(460)}; text-wrap: balance; }
  .frame { margin: ${px(44)} 0 0 ${px(f.left)}; width: ${px(f.width)}; padding: ${px(f.bezel)}; border-radius: ${px(f.radius)}; background: ${rosa[600]}; box-shadow: 0 ${px(40)} ${px(80)} ${shadow}0.28), 0 ${px(6)} ${px(16)} ${shadow}0.16); }
  .screen { overflow: hidden; border-radius: ${px(f.radius - f.bezel)}; }
  .screen img { display: block; width: 100%; margin-top: -${(((f.cropTop ?? 0) + scrollTop) * 100 * f.aspect).toFixed(2)}%; }
  </style></head><body>
  <div class="copy">
    <span class="label">${escape(eyebrow)}</span>
    <h1>${escape(title)}</h1>
  </div>
  <div class="frame"><div class="screen"><img src="${screen}" alt=""></div></div>
  </body></html>`;
}

// The brand graphics share the look of App Store header A «Logo al centro»
// (owner, 2026-11-25): the full Emma wordmark centred on rosa 100, with rosa
// 200 discs and rosa 300 rings as atmosphere. The Staff app adds «Equipo»
// between two fine rules under the wordmark, in the same colours. Each layout
// is drawn on its own grid (`grid` units across `width` pixels).
function brandHtml({ logo, label, fonts, width, grid, shapes, box, sizes }) {
  const u = width / grid;
  const px = (value) => `${(value * u).toFixed(2)}px`;
  const ring = grid / 640;
  const shape = ([left, top, size, fill]) =>
    `<div style="position:absolute;left:${px(left)};top:${px(top)};width:${px(size)};height:${px(size)};border-radius:50%;${fill ? `background:${rosa[200]}` : `box-sizing:border-box;border:${px(ring)} solid ${rosa[300]}`}"></div>`;
  const s = label === undefined ? sizes.client : sizes.staff;
  const tag = label === undefined ? "" : `<div class="tag"><span class="rule"></span><span>${escape(label)}</span><span class="rule"></span></div>`;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
  ${fontFaces(fonts)}
  html, body { margin: 0; }
  body { width: 100vw; height: 100vh; overflow: hidden; background: ${rosa[100]}; color: ${rosa[600]}; font-family: Work, sans-serif; position: relative; }
  .box { position: absolute; ${box.map((value, i) => `${["left", "top", "width", "height"][i]}: ${px(value)};`).join(" ")} display: flex; flex-direction: column; align-items: center; justify-content: center; gap: ${px(s.gap ?? 0)}; }
  .wordmark { width: ${px(s.logo)}; }
  .tag { display: flex; align-items: center; gap: ${px(s.gap ?? 0)}; font-size: ${px(s.word ?? 0)}; font-weight: 600; letter-spacing: 0.3em; text-transform: uppercase; }
  .rule { display: block; width: ${px(s.rule ?? 0)}; height: ${px(ring)}; background: ${rosa[600]}; }
  </style></head><body>
  ${shapes.map(shape).join("")}
  <div class="box"><img class="wordmark" src="${logo.src}" alt="">${tag}</div>
  </body></html>`;
}

// The 1024 × 500 Play feature graphic, on a 1024 grid. The Staff word is set
// at 20 px bold so it counts as large text on rosa 100.
export function featureHtml({ logo, label, fonts }) {
  return brandHtml({
    logo,
    label,
    fonts,
    width: 1024,
    grid: 1024,
    shapes: [[-140, 220, 420, true], [-49.6, 100, 300, false], [769.6, -190.4, 400, true], [809.6, 169.6, 340, false]],
    box: [0, 0, 1024, 500],
    sizes: { client: { logo: 460 }, staff: { logo: 416, gap: 14, rule: 44, word: 20 } },
  });
}

// The 3840 × 1646 (21:9) App Store product page header, on a 1280 grid. Apple
// keeps only the centred 1646 × 661 art safe area on every device and
// orientation, so the wordmark (and the Staff word) sits inside it.
export function headerHtml({ logo, label, width, fonts }) {
  return brandHtml({
    logo,
    label,
    fonts,
    width,
    grid: 1280,
    shapes: [[-170, 250, 520, true], [-60, 120, 360, false], [960, -230, 500, true], [1010, 200, 420, false]],
    box: [366, 164, 549, 221],
    sizes: { client: { logo: 500 }, staff: { logo: 400, gap: 12, rule: 36, word: 15 } },
  });
}
