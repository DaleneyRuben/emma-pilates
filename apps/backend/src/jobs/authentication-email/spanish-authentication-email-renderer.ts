import type { AuthenticationEmailJob } from './authentication-email-job';
import type { AuthenticationEmailMessage } from './authentication-email-delivery';
import type {
  AuthenticationEmailRenderInput,
  AuthenticationEmailRenderer,
} from './process-authentication-email';

// EML-001: the accepted copy of follow-ups 33–38 and the IDN-008 rule in
// neutral Bolivian Spanish («tú»). Each message is plain text plus a simple
// HTML version in the design palette; the link is a button and a bare URL,
// and nothing else secret is ever written. Built from the follow-ups while
// the DES-001 export stays pending, as MOB-004 did.
type Purpose = AuthenticationEmailJob['purpose'];

type Template = {
  subject: string;
  intro: string;
  button: string | null;
  after: readonly string[];
  path: string | null;
};

const templates: Record<Purpose, Template> = {
  verification: {
    subject: 'Confirma tu correo para activar tu cuenta',
    intro:
      'Gracias por registrarte en Emma Pilates Studio. Confirma tu correo para terminar de crear tu cuenta.',
    button: 'Confirmar mi correo',
    after: [
      'Este enlace vence en 24 horas. Después de confirmar, vuelve a la app e inicia sesión con tu correo y tu contraseña.',
      'Si pediste otro enlace, solo el más reciente funciona.',
    ],
    path: '/authentication/verify-email',
  },
  activation: {
    subject: 'Activa tu cuenta en Emma Pilates Studio',
    intro:
      'El estudio creó una cuenta para ti. Abre el enlace para elegir tu contraseña y activar tu cuenta.',
    button: 'Activar mi cuenta',
    after: [
      'Este enlace vence en 7 días. Si vence, pide en el estudio que te envíen uno nuevo.',
      'Activar tu cuenta no inicia sesión: después vuelve a la app e ingresa con tu correo y la contraseña que elijas.',
    ],
    path: '/authentication/activate-account',
  },
  password_recovery: {
    subject: 'Crea una contraseña nueva',
    intro:
      'Recibimos un pedido para restablecer la contraseña de tu cuenta. Abre el enlace para crear una nueva.',
    button: 'Crear contraseña nueva',
    after: [
      'Este enlace vence en 30 minutos. Al terminar, cerraremos tus otras sesiones.',
      'Si no pediste cambiar tu contraseña, ignora este correo: tu contraseña sigue igual.',
    ],
    path: '/authentication/recover-password',
  },
  email_change: {
    subject: 'Confirma tu correo nuevo',
    intro:
      'Pediste usar este correo para entrar a Emma Pilates Studio. Abre el enlace para confirmar el cambio.',
    button: 'Confirmar mi correo nuevo',
    after: [
      'Este enlace vence en 24 horas. Hasta que lo confirmes, tu correo anterior sigue siendo el de tu cuenta.',
      'Si no pediste este cambio, ignora este correo.',
    ],
    path: '/authentication/confirm-email-change',
  },
  email_change_notice: {
    subject: 'Alguien pidió cambiar el correo de tu cuenta',
    intro:
      'Desde tu cuenta se pidió cambiar el correo a {newEmail}. Nada cambia hasta que ese correo confirme el enlace que le enviamos.',
    button: null,
    after: [
      'Si fuiste tú, no tienes que hacer nada más.',
      'Si no fuiste tú, cancela el cambio desde Editar perfil en la app y cambia tu contraseña: eso cierra las demás sesiones. Si necesitas ayuda, escríbenos al estudio.',
    ],
    path: null,
  },
};

const studio = 'Emma Pilates Studio';
const footer = 'Movimiento · Equilibrio · Bienestar';

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const paragraph = (text: string): string =>
  `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#4A4A4A;">${escapeHtml(text)}</p>`;

export class SpanishAuthenticationEmailRenderer implements AuthenticationEmailRenderer {
  constructor(private readonly options: { linkBaseUrl: string }) {}

  render(input: AuthenticationEmailRenderInput): AuthenticationEmailMessage {
    const template = templates[input.purpose];
    const link =
      template.path === null || input.linkSecret === null
        ? null
        : // ADR-0095: the prefix names the app whose links claim the path.
          `${this.options.linkBaseUrl.replace(/\/$/, '')}/${input.identityKind}${template.path}?token=${encodeURIComponent(input.linkSecret)}`;
    const intro = template.intro.replace('{newEmail}', input.newEmail ?? '');

    const textLines = [
      'Hola,',
      '',
      intro,
      '',
      ...(link === null ? [] : [link, '']),
      ...template.after.flatMap((line) => [line, '']),
      `${studio} · ${footer}`,
    ];

    const button =
      link === null || template.button === null
        ? ''
        : `<p style="margin:24px 0;"><a href="${link}" style="display:inline-block;background:#B78380;color:#FFFFFF;text-decoration:none;font-weight:500;padding:14px 24px;border-radius:8px;">${escapeHtml(template.button)}</a></p>` +
          `<p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:#6E6663;">Si el botón no funciona, copia este enlace en tu navegador:<br><a href="${link}" style="color:#B78380;word-break:break-all;">${link}</a></p>`;

    const html =
      `<!doctype html><html lang="es"><body style="margin:0;padding:0;background:#F2ECE5;font-family:'Work Sans',Helvetica,Arial,sans-serif;">` +
      `<div style="max-width:560px;margin:0 auto;padding:32px 16px;">` +
      `<div style="background:#FFFFFF;border:1px solid #E4D8CC;border-radius:12px;padding:32px 24px;">` +
      `<h1 style="margin:0 0 24px;font-family:Lora,Georgia,serif;font-weight:500;font-size:22px;line-height:1.3;color:#4A4A4A;">${escapeHtml(template.subject)}</h1>` +
      paragraph('Hola,') +
      paragraph(intro) +
      button +
      template.after.map(paragraph).join('') +
      `</div>` +
      `<p style="margin:24px 0 0;text-align:center;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#8A807C;">${escapeHtml(studio)}<br>${escapeHtml(footer)}</p>` +
      `</div></body></html>`;

    return {
      recipient: input.recipient,
      purpose: input.purpose,
      subject: template.subject,
      link,
      text: textLines.join('\n'),
      html,
    };
  }
}
