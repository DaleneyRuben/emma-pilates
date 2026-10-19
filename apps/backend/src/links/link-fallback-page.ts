import type { AuthenticationLinkIdentityKind } from '../jobs/authentication-email/process-authentication-email';

// ADR-0095: a link opened where no app claims it. The page only explains
// and points onward; it never uses the token, so a mail scanner's prefetch
// cannot spend a single-use link. Palette and fonts follow the emails.
export type LinkFallbackInput = {
  identityKind: AuthenticationLinkIdentityKind;
  purpose: string;
  token: string | null;
  adminWebOrigin: string;
};

const actions: Record<
  AuthenticationLinkIdentityKind,
  Readonly<Record<string, string>>
> = {
  client: {
    'verify-email': 'confirmar tu correo',
    'activate-account': 'activar tu cuenta',
    'recover-password': 'crear tu contraseña nueva',
    'confirm-email-change': 'confirmar tu correo nuevo',
  },
  staff: {
    'activate-account': 'activar tu cuenta',
    'recover-password': 'crear tu contraseña nueva',
  },
};

const apps: Record<
  AuthenticationLinkIdentityKind,
  { name: string; packageName: string }
> = {
  client: { name: 'Emma Pilates', packageName: 'com.emmapilates.client' },
  staff: { name: 'Emma Pilates Staff', packageName: 'com.emmapilates.staff' },
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const paragraph = (text: string): string =>
  `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#4A4A4A;">${escapeHtml(text)}</p>`;

const button = (href: string, label: string, primary: boolean): string =>
  `<p style="margin:0 0 12px;"><a href="${escapeHtml(href)}" style="display:block;text-align:center;text-decoration:none;font-weight:500;padding:14px 24px;border-radius:8px;${
    primary
      ? 'background:#B78380;color:#FFFFFF;'
      : 'border:1px solid #B78380;color:#B78380;'
  }">${escapeHtml(label)}</a></p>`;

export const renderLinkFallbackPage = (
  input: LinkFallbackInput,
): string | null => {
  const action = actions[input.identityKind][input.purpose];

  if (action === undefined) {
    return null;
  }

  const app = apps[input.identityKind];
  // Administrators usually work on a computer, where the admin web's
  // create-password page already completes activation and recovery.
  const browser =
    input.identityKind === 'staff' && input.token !== null
      ? paragraph('¿Estás en la computadora? También puedes seguir aquí:') +
        button(
          `${input.adminWebOrigin}/crear-contrasena?token=${encodeURIComponent(input.token)}`,
          'Continuar en el navegador',
          false,
        )
      : '';

  return (
    `<!doctype html><html lang="es"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<title>Abre la app ${escapeHtml(app.name)}</title></head>` +
    `<body style="margin:0;padding:0;background:#F2ECE5;font-family:'Work Sans',Helvetica,Arial,sans-serif;">` +
    `<main style="max-width:480px;margin:0 auto;padding:32px 16px;">` +
    `<div style="background:#FFFFFF;border:1px solid #E4D8CC;border-radius:12px;padding:32px 24px;">` +
    `<h1 style="margin:0 0 24px;font-family:Lora,Georgia,serif;font-weight:500;font-size:22px;line-height:1.3;color:#4A4A4A;">Abre este enlace en la app</h1>` +
    paragraph(
      `Para ${action}, abre este enlace desde el teléfono donde tienes instalada la app ${app.name}.`,
    ) +
    paragraph('Si todavía no tienes la app, descárgala:') +
    button(
      `https://play.google.com/store/apps/details?id=${app.packageName}`,
      'Descargar en Google Play',
      true,
    ) +
    browser +
    `</div>` +
    `<p style="margin:24px 0 0;text-align:center;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#8A807C;">Emma Pilates Studio<br>Movimiento · Equilibrio · Bienestar</p>` +
    `</main></body></html>`
  );
};
