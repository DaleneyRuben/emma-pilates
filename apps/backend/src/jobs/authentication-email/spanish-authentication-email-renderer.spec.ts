import { SpanishAuthenticationEmailRenderer } from './spanish-authentication-email-renderer';

// EML-001: the copy accepted in follow-ups 33–38 and the IDN-008 rule, in
// neutral Bolivian Spanish («tú»), plain text plus simple HTML in the design
// palette, the link as a button and as a bare URL, no other secret.
describe('SpanishAuthenticationEmailRenderer', () => {
  const renderer = new SpanishAuthenticationEmailRenderer({
    linkBaseUrl: 'https://links.emmapilates.test',
  });

  it.each([
    [
      'verification',
      'https://links.emmapilates.test/authentication/verify-email?token=secret-1',
    ],
    [
      'activation',
      'https://links.emmapilates.test/authentication/activate-account?token=secret-1',
    ],
    [
      'password_recovery',
      'https://links.emmapilates.test/authentication/recover-password?token=secret-1',
    ],
    [
      'email_change',
      'https://links.emmapilates.test/authentication/confirm-email-change?token=secret-1',
    ],
  ] as const)(
    'renders the %s email with its link as a button and a bare URL',
    (purpose, link) => {
      const message = renderer.render({
        recipient: 'lucia@example.com',
        purpose,
        linkSecret: 'secret-1',
        ...(purpose === 'email_change'
          ? { newEmail: 'lucia@example.com' }
          : {}),
      });

      expect(message.recipient).toBe('lucia@example.com');
      expect(message.purpose).toBe(purpose);
      expect(message.link).toBe(link);
      expect(message.text).toContain(link);
      expect(message.html).toContain(`href="${link}"`);
      expect(message.html).toContain(`>${link}<`);
      expect(message.text).not.toMatch(/token=(?!secret-1)/);
      expect({
        subject: message.subject,
        text: message.text,
      }).toMatchSnapshot();
      expect(message.html).toMatchSnapshot();
    },
  );

  it('renders the old-address notice without any link, naming the new address', () => {
    const message = renderer.render({
      recipient: 'lucia@example.com',
      purpose: 'email_change_notice',
      linkSecret: null,
      newEmail: 'lucia.nueva@example.com',
    });

    expect(message.link).toBeNull();
    expect(message.text).toContain('lucia.nueva@example.com');
    expect(message.text).not.toContain('http');
    expect(message.html).not.toContain('href');
    expect({ subject: message.subject, text: message.text }).toMatchSnapshot();
    expect(message.html).toMatchSnapshot();
  });

  it('escapes the new address in the HTML and states each link lifetime', () => {
    const notice = renderer.render({
      recipient: 'lucia@example.com',
      purpose: 'email_change_notice',
      linkSecret: null,
      newEmail: 'x<script>@example.com',
    });
    expect(notice.html).toContain('x&lt;script&gt;@example.com');
    expect(notice.html).not.toContain('<script>');

    const lifetimes: Record<string, string> = {
      verification: '24 horas',
      activation: '7 días',
      password_recovery: '30 minutos',
      email_change: '24 horas',
    };
    for (const [purpose, lifetime] of Object.entries(lifetimes)) {
      expect(
        renderer.render({
          recipient: 'a@example.com',
          purpose: purpose as 'verification',
          linkSecret: 's',
        }).text,
      ).toContain(lifetime);
    }
  });
});
