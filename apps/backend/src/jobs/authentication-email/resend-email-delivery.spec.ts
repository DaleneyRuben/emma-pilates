import type { AuthenticationEmailMessage } from './authentication-email-delivery';
import { AuthenticationEmailDeliveryError } from './authentication-email-failure';
import { createResendEmailDelivery } from './resend-email-delivery';

const message: AuthenticationEmailMessage = {
  recipient: 'client@example.com',
  purpose: 'verification',
  subject: 'Verifica tu correo',
  link: 'https://links.emmapilates.test/authentication/verify?token=s',
  text: 'text',
  html: '<p>html</p>',
};

const settings = {
  apiKey: 're_test_key',
  from: 'Emma Pilates Studio <no-responder@emmapilatesstudio.com>',
  replyTo: 'soporte@emmapilatesstudio.com',
};

const respond = (status: number, body: unknown = {}) =>
  jest.fn<Promise<Response>, Parameters<typeof fetch>>().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  );

const deliver = (fetch: typeof globalThis.fetch, signal?: AbortSignal) =>
  createResendEmailDelivery({ ...settings, fetch }).deliver(message, {
    signal: signal ?? new AbortController().signal,
  });

describe('Resend email delivery', () => {
  it('posts the message to the Resend API with the key, sender, and reply-to address', async () => {
    const fetch = respond(200, { id: 'email-1' });
    const signal = new AbortController().signal;

    await deliver(fetch, signal);

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init?.method).toBe('POST');
    expect(init?.signal).toBe(signal);
    expect(init?.headers).toEqual({
      authorization: 'Bearer re_test_key',
      'content-type': 'application/json',
    });
    expect(JSON.parse(init?.body as string)).toEqual({
      from: 'Emma Pilates Studio <no-responder@emmapilatesstudio.com>',
      to: ['client@example.com'],
      reply_to: 'soporte@emmapilatesstudio.com',
      subject: 'Verifica tu correo',
      text: 'text',
      html: '<p>html</p>',
      tags: [{ name: 'purpose', value: 'verification' }],
    });
  });

  it.each([
    [429, 'rate_limit'],
    [500, 'provider_server'],
    [503, 'provider_server'],
    [401, 'provider_authentication'],
    [403, 'provider_authentication'],
    [400, 'invalid_input'],
    [422, 'invalid_input'],
    [404, 'permanent'],
    [451, 'permanent'],
  ])('maps a %i response to the %s failure', async (status, category) => {
    const failure = deliver(respond(status));

    await expect(failure).rejects.toBeInstanceOf(
      AuthenticationEmailDeliveryError,
    );
    await expect(failure).rejects.toMatchObject({ category });
  });

  it('reports a network failure when the request cannot be made', async () => {
    const fetch = jest
      .fn<Promise<Response>, Parameters<typeof globalThis.fetch>>()
      .mockRejectedValue(new TypeError('fetch failed'));

    await expect(deliver(fetch)).rejects.toMatchObject({
      category: 'network',
    });
  });

  it('reports a timeout when the deadline aborted the request', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetch = jest
      .fn<Promise<Response>, Parameters<typeof globalThis.fetch>>()
      .mockRejectedValue(new DOMException('aborted', 'AbortError'));

    await expect(deliver(fetch, controller.signal)).rejects.toMatchObject({
      category: 'timeout',
    });
  });
});
