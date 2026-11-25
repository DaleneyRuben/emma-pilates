// The HTML of the store graphics in «Rosa Emma», drawn on a 540-wide grid
// and scaled to each store size with one unit (`u` = width / 540), so every
// size keeps the same proportions. Colors are the apps' Rosa Emma scale
// (packages/mobile-core/src/ui/tokens.ts): rosa 100 fills the ground, rosa
// 600 inks the Lora title and draws the device frame. Small text sits only on
// white, crema, rosa 50 or rosa 600, so the label rides on a white pill.
const rosa = { 50: "#FEF6F2", 100: "#F9E7DF", 200: "#E7CCBF", 300: "#DAB9AB", 600: "#93615D", white: "#FFFBFB" };
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
  body { width: 100vw; height: 100vh; overflow: hidden; background: ${rosa[100]}; color: ${rosa[600]}; font-family: Work, sans-serif; position: relative; }
  .copy { padding: ${px(64)} ${px(48)} 0; display: flex; flex-direction: column; align-items: flex-start; gap: ${px(20)}; }
  .label { padding: ${px(8)} ${px(16)}; border-radius: ${px(999)}; background: ${rosa.white}; font-size: ${px(12)}; font-weight: 600; letter-spacing: 0.22em; text-transform: uppercase; color: ${rosa[600]}; }
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

// The 1024 × 500 Play feature graphic: the logo on the rosa 100 ground and
// the copy on a white card, so its small text sits on white. The Client app
// shows the studio wordmark; the Staff app its ringed «E» on a rosa 600 tile.
export function featureHtml({ label, title, note, logo, fonts }) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
  ${fontFaces(fonts)}
  html, body { margin: 0; }
  body { width: 1024px; height: 500px; overflow: hidden; background: ${rosa[100]}; color: ${rosa[600]}; font-family: Work, sans-serif; display: flex; align-items: center; }
  .logo { width: 452px; display: flex; justify-content: center; }
  .logo img.wordmark { width: 360px; }
  .logo .tile { width: 220px; height: 220px; overflow: hidden; border-radius: 52px; background: ${rosa[600]}; display: flex; align-items: center; justify-content: center; box-shadow: 0 24px 48px ${shadow}0.28); }
  .logo .tile img { width: 340px; flex: none; }
  .card { width: 476px; box-sizing: border-box; padding: 44px 44px 46px; border-radius: 32px; background: ${rosa.white}; display: flex; flex-direction: column; gap: 16px; box-shadow: 0 18px 40px ${shadow}0.14); }
  .label { font-size: 12px; font-weight: 600; letter-spacing: 0.24em; text-transform: uppercase; }
  h1 { margin: 0; font-family: Lora, serif; font-weight: 500; font-size: 42px; line-height: 1.08; letter-spacing: -0.01em; text-wrap: balance; }
  p { margin: 0; font-size: 18px; line-height: 1.45; }
  </style></head><body>
  <div class="logo">${logo.kind === "tile" ? `<div class="tile"><img src="${logo.src}" alt=""></div>` : `<img class="wordmark" src="${logo.src}" alt="">`}</div>
  <div class="card">
    <span class="label">${escape(label)}</span>
    <h1>${escape(title)}</h1>
    <p>${escape(note)}</p>
  </div>
  </body></html>`;
}

// The 3840 × 1646 (21:9) App Store product page header, option A «Logo al
// centro» (owner, 2026-11-25), drawn on a 1280-wide grid. Apple keeps only the
// centred 1646 × 661 art safe area on every device and orientation, so the
// logo (and the Staff name) sits inside it; rosa 200 discs and rosa 300 rings
// fill the rest as atmosphere. The Client app shows the studio wordmark; the
// Staff app its grey icon unchanged, the label on a white pill and the name.
export function headerHtml({ logo, label, title, width, fonts }) {
  const u = width / 1280;
  const px = (value) => `${(value * u).toFixed(2)}px`;
  const shape = (left, top, size, fill) =>
    `<div style="position:absolute;left:${px(left)};top:${px(top)};width:${px(size)};height:${px(size)};border-radius:50%;${fill ? `background:${rosa[200]}` : `box-sizing:border-box;border:${px(2)} solid ${rosa[300]}`}"></div>`;
  const content =
    logo.kind === "icon"
      ? `<img class="icon" src="${logo.src}" alt=""><div class="name"><span class="label">${escape(label)}</span><h1>${escape(title)}</h1></div>`
      : `<img class="wordmark" src="${logo.src}" alt="">`;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
  ${fontFaces(fonts)}
  html, body { margin: 0; }
  body { width: 100vw; height: 100vh; overflow: hidden; background: ${rosa[100]}; color: ${rosa[600]}; font-family: Work, sans-serif; position: relative; }
  .safe { position: absolute; left: ${px(366)}; top: ${px(164)}; width: ${px(549)}; height: ${px(221)}; display: flex; align-items: center; justify-content: center; gap: ${px(36)}; }
  .wordmark { width: ${px(500)}; }
  .icon { flex: none; width: ${px(200)}; height: ${px(200)}; border-radius: ${px(45)}; box-shadow: 0 ${px(20)} ${px(40)} ${shadow}0.28); }
  .name { width: ${px(300)}; display: flex; flex-direction: column; align-items: flex-start; gap: ${px(14)}; }
  .label { padding: ${px(6)} ${px(14)}; border-radius: ${px(999)}; background: ${rosa.white}; font-size: ${px(14)}; font-weight: 600; letter-spacing: 0.22em; text-transform: uppercase; }
  h1 { margin: 0; font-family: Lora, serif; font-weight: 500; font-size: ${px(48)}; line-height: 1.06; letter-spacing: -0.01em; }
  </style></head><body>
  ${shape(-170, 250, 520, true)}${shape(-60, 120, 360, false)}${shape(960, -230, 500, true)}${shape(1010, 200, 420, false)}
  <div class="safe">${content}</div>
  </body></html>`;
}
