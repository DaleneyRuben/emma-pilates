// The HTML of option A «Editorial», drawn on a 540-wide grid and scaled to
// each store size with one unit (`u` = width / 540), so every size keeps the
// same proportions. Colors are the app's v2 tokens: Lino #FAF7F2, Rosa
// profundo #93615D, text #3A3330, muted #6F6662.

const escape = (text) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const fontFaces = (fonts) => `
  @font-face { font-family: Lora; font-weight: 500; src: url(${fonts.lora("500Medium")}); }
  @font-face { font-family: Work; font-weight: 400; src: url(${fonts.work("400Regular")}); }
  @font-face { font-family: Work; font-weight: 600; src: url(${fonts.work("600SemiBold")}); }`;

// A phone sits narrower than an iPad. The iPad Simulator ignores the 9:41
// status bar override, so its status bar is cropped (`cropTop`, of the height).
const frames = {
  phone: { left: 96, top: 380, width: 348, bezel: 10, radius: 58, aspect: 2622 / 1206 },
  tablet: { left: 34, top: 380, width: 448, bezel: 12, radius: 40, cropTop: 0.026, aspect: 2420 / 1668 },
};

export function shotHtml({ eyebrow, title, note, screen, width, device, fonts, phone }) {
  const u = width / 540;
  // A phone shot may raise its frame (`top`) and scroll its screen (`scrollTop`,
  // of the screen height) so a list at the bottom shows; a tablet never needs it.
  const f = device === "phone" ? { ...frames.phone, ...phone } : frames[device];
  const scrollTop = f.scrollTop ?? 0;
  const px = (value) => `${(value * u).toFixed(2)}px`;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
  ${fontFaces(fonts)}
  html, body { margin: 0; }
  body { width: 100vw; height: 100vh; overflow: hidden; background: #FAF7F2; color: #3A3330; font-family: Work, sans-serif; position: relative; }
  .copy { padding: ${px(64)} ${px(48)} 0; display: flex; flex-direction: column; gap: ${px(18)}; }
  .eyebrow { display: flex; align-items: center; gap: ${px(12)}; }
  .rule { width: ${px(28)}; height: ${px(1.2)}; background: #93615D; }
  .label { font-size: ${px(13)}; font-weight: 600; letter-spacing: 0.24em; text-transform: uppercase; color: #93615D; }
  h1 { margin: 0; font-family: Lora, serif; font-weight: 500; font-size: ${px(46)}; line-height: 1.06; letter-spacing: -0.01em; max-width: ${px(440)}; text-wrap: balance; }
  p { margin: 0; font-size: ${px(17)}; line-height: 1.5; color: #6F6662; max-width: ${px(400)}; }
  .frame { position: absolute; left: ${px(f.left)}; top: ${px(f.top)}; width: ${px(f.width)}; padding: ${px(f.bezel)}; border-radius: ${px(f.radius)}; background: #2B2523; box-shadow: 0 ${px(40)} ${px(80)} rgba(74,58,48,0.22), 0 ${px(6)} ${px(16)} rgba(74,58,48,0.12); }
  .screen { overflow: hidden; border-radius: ${px(f.radius - f.bezel)}; }
  .screen img { display: block; width: 100%; margin-top: -${(((f.cropTop ?? 0) + scrollTop) * 100 * f.aspect).toFixed(2)}%; }
  </style></head><body>
  <div class="copy">
    <div class="eyebrow"><span class="rule"></span><span class="label">${escape(eyebrow)}</span></div>
    <h1>${escape(title)}</h1>
    <p>${escape(note)}</p>
  </div>
  <div class="frame"><div class="screen"><img src="${screen}" alt=""></div></div>
  </body></html>`;
}

export function featureHtml({ label, title, note, logo, fonts }) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
  ${fontFaces(fonts)}
  html, body { margin: 0; }
  body { width: 1024px; height: 500px; overflow: hidden; background: #FAF7F2; color: #3A3330; font-family: Work, sans-serif; display: flex; align-items: center; }
  .logo { width: 470px; display: flex; justify-content: center; }
  .logo img.wordmark { width: 380px; }
  .logo img.icon { width: 200px; border-radius: 44px; box-shadow: 0 24px 48px rgba(74,58,48,0.22); }
  .divider { width: 1px; height: 220px; background: #D9C9BF; }
  .copy { padding-left: 64px; display: flex; flex-direction: column; gap: 16px; max-width: 420px; }
  .label { font-size: 12px; font-weight: 600; letter-spacing: 0.26em; text-transform: uppercase; color: #93615D; }
  h1 { margin: 0; font-family: Lora, serif; font-weight: 500; font-size: 44px; line-height: 1.08; letter-spacing: -0.01em; text-wrap: balance; }
  p { margin: 0; font-size: 17px; line-height: 1.5; color: #6F6662; }
  </style></head><body>
  <div class="logo"><img class="${logo.kind}" src="${logo.src}" alt=""></div>
  <div class="divider"></div>
  <div class="copy">
    <span class="label">${escape(label)}</span>
    <h1>${escape(title)}</h1>
    <p>${escape(note)}</p>
  </div>
  </body></html>`;
}
