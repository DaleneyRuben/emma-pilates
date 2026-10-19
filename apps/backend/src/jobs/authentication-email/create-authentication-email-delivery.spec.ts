import { createAuthenticationEmailDelivery } from './create-authentication-email-delivery';
import { LocalEmailCapture } from './local-email-capture';

const settings = {
  RESEND_API_KEY: null,
  EMAIL_FROM: 'Emma Pilates Studio <no-responder@emmapilatesstudio.com>',
  EMAIL_REPLY_TO: 'soporte@emmapilatesstudio.com',
  EMAIL_CAPTURE_DIRECTORY: '.data/email-capture',
};

const message = {
  recipient: 'client@example.com',
  purpose: 'recovery' as const,
  subject: 'Restablece tu contraseña',
  link: 'https://links.emmapilates.test/authentication/recover?token=s',
  text: 'text',
  html: '<p>html</p>',
};

describe('authentication email delivery selection', () => {
  it('sends through Resend whenever an API key is configured', async () => {
    const fetch = jest
      .fn<Promise<Response>, Parameters<typeof globalThis.fetch>>()
      .mockResolvedValue(new Response('{"id":"email-1"}', { status: 200 }));

    const delivery = createAuthenticationEmailDelivery(
      { ...settings, NODE_ENV: 'production', RESEND_API_KEY: 're_key' },
      fetch,
    );
    await delivery?.deliver(message, {
      signal: new AbortController().signal,
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toBe('https://api.resend.com/emails');
  });

  it('captures email locally outside production without a key', () => {
    expect(
      createAuthenticationEmailDelivery(
        { ...settings, NODE_ENV: 'development' },
        jest.fn(),
      ),
    ).toBeInstanceOf(LocalEmailCapture);
  });

  it('disables email in production without a key, leaving jobs queued', () => {
    expect(
      createAuthenticationEmailDelivery(
        { ...settings, NODE_ENV: 'production' },
        jest.fn(),
      ),
    ).toBeNull();
  });
});
