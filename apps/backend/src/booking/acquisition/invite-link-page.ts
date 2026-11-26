// Walkthrough n.º 13 (CW01, CW01b, CW01c): the link a Client shares,
// links.emmapilatesstudio.com/client/invite/CODE. With the app installed the
// system opens the app instead (the Client app claims /client/invite/*).
// Android goes straight to Google Play with the code as the install
// referrer; an iPhone gets one button that copies the code and opens the App
// Store; anything else gets both stores. Rosa Emma palette, as the boards.

export type InviteLinkInput = {
  userAgent: string;
  /** Null when nobody holds the code: the link still leads to the stores. */
  invite: { code: string; holderFirstName: string } | null;
};

export type InviteLinkDestination =
  { kind: 'redirect'; location: string } | { kind: 'page'; html: string };

const packageName = 'com.emmapilates.client';
const appStoreUrl = 'https://apps.apple.com/app/id6838534444';
const playUrl = `https://play.google.com/store/apps/details?id=${packageName}`;
// Served by the public site (apps/public-site), 1200 × 630.
const previewImage = 'https://app.emmapilatesstudio.com/compartir.png';

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const apple =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFBFB" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 7c1-2 3-3 4-3 0 2-1 3-2.5 3.5M8 8c2 0 3 1 4 1s2-1 4-1c1.5 0 3 1 3.5 2.5-2 1-2.5 4 0 5.5-.8 2-2.3 4-3.8 4-1.2 0-1.7-.7-3.2-.7s-2 .7-3.2.7C6.3 20 4 16.5 4 13c0-3 2-5 4-5z"/></svg>';
const play =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFBFB" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4l14 8-14 8z"/></svg>';

const button = (href: string, icon: string, label: string, id = ''): string =>
  `<a ${id === '' ? '' : `id="${id}" `}href="${escapeHtml(href)}" style="flex:1;display:flex;align-items:center;justify-content:center;gap:8px;min-height:56px;padding:0 18px;border-radius:16px;background:#93615D;color:#FFFBFB;font-size:16px;font-weight:700;text-decoration:none;">${icon}${escapeHtml(label)}</a>`;

// Copy first, then open the store; a failed copy still opens it.
const copyThenOpen = (code: string): string =>
  `<script>document.getElementById('copy-and-open').addEventListener('click',function(e){e.preventDefault();var go=function(){location.href=${JSON.stringify(appStoreUrl)};};try{navigator.clipboard.writeText(${JSON.stringify(code)}).then(go,go);}catch(_){go();}});</script>`;

const render = (input: InviteLinkInput, iphone: boolean): string => {
  const title =
    input.invite === null
      ? 'Tu primera clase en Emma Pilates Studio'
      : `${input.invite.holderFirstName} te regala tu primera clase`;
  const description =
    input.invite === null
      ? 'Descarga la app de Emma Pilates Studio.'
      : `Usa su código ${input.invite.code} al crear tu cuenta y tu primera clase es gratis.`;
  const code =
    input.invite === null
      ? ''
      : `<div style="background:#93615D;color:#FFFBFB;border-radius:24px;padding:20px;display:flex;flex-direction:column;gap:8px;"><span style="font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;">SU CÓDIGO</span><span style="font-family:Lora,Georgia,serif;font-weight:500;font-size:34px;line-height:1.1;">${escapeHtml(input.invite.code)}</span></div>`;
  const buttons = iphone
    ? button(
        appStoreUrl,
        apple,
        input.invite === null
          ? 'Abrir App Store'
          : 'Copiar código y abrir App Store',
        input.invite === null ? '' : 'copy-and-open',
      )
    : `${button(appStoreUrl, apple, 'App Store')}${button(playUrl, play, 'Google Play')}`;
  return (
    `<!doctype html><html lang="es"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<title>${escapeHtml(title)}</title>` +
    `<meta property="og:title" content="${escapeHtml(title)}">` +
    `<meta property="og:description" content="${escapeHtml(description)}">` +
    `<meta property="og:site_name" content="Emma Pilates Studio">` +
    `<meta property="og:type" content="website">` +
    `<meta property="og:image" content="${previewImage}">` +
    `</head><body style="margin:0;background:#F9E7DF;color:#93615D;font-family:'Work Sans',Helvetica,Arial,sans-serif;">` +
    `<main style="max-width:520px;margin:0 auto;padding:40px 16px;display:flex;flex-direction:column;gap:20px;">` +
    `<span style="align-self:flex-start;padding:4px 10px;border-radius:999px;background:#FFFBFB;font-size:12px;font-weight:700;letter-spacing:.12em;">EMMA PILATES STUDIO</span>` +
    `<h1 style="margin:0;font-family:Lora,Georgia,serif;font-weight:500;font-size:30px;line-height:1.1;">${escapeHtml(title)}</h1>` +
    code +
    `<div style="display:flex;gap:12px;flex-wrap:wrap;">${buttons}</div>` +
    `</main>` +
    (iphone && input.invite !== null ? copyThenOpen(input.invite.code) : '') +
    `</body></html>`
  );
};

export const inviteLinkDestination = (
  input: InviteLinkInput,
): InviteLinkDestination => {
  if (/Android/i.test(input.userAgent)) {
    return {
      kind: 'redirect',
      location:
        input.invite === null
          ? playUrl
          : `${playUrl}&referrer=${encodeURIComponent(`invite_code=${input.invite.code}`)}`,
    };
  }
  const iphone = /iPhone|iPad|iPod/i.test(input.userAgent);
  return { kind: 'page', html: render(input, iphone) };
};
