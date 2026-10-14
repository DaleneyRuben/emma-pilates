import { createExpoPushProvider } from './expo-push-provider';
import {
  PermanentPushError,
  TransientPushError,
  type PushMessage,
} from './push-provider';

const message: PushMessage = {
  to: 'ExponentPushToken[aaaa]',
  title: 'Cupo liberado',
  body: '¡Tienes un cupo!',
  sound: 'default',
  badge: 2,
  channelId: 'actionable',
  priority: 'high',
  data: {
    notificationId: '11111111-1111-4111-8111-111111111111',
    type: 'waitlist_promoted',
    destinationType: 'booking',
    destinationId: '22222222-2222-4222-8222-222222222222',
  },
};

const respond = (status: number, body: unknown, headers = {}) =>
  jest.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json', ...headers },
    }),
  );

describe('Expo push provider', () => {
  it('posts the messages with the access token and maps each ticket', async () => {
    const fetch = respond(200, {
      data: [
        { status: 'ok', id: 'ticket-1' },
        {
          status: 'error',
          message: 'not registered',
          details: { error: 'DeviceNotRegistered' },
        },
        {
          status: 'error',
          message: 'bad credentials',
          details: { error: 'InvalidCredentials' },
        },
      ],
    });
    const provider = createExpoPushProvider({ fetch, accessToken: 'secret' });

    await expect(provider.send([message, message, message])).resolves.toEqual([
      { status: 'ok', id: 'ticket-1' },
      {
        status: 'error',
        category: 'device_not_registered',
        deviceNotRegistered: true,
      },
      {
        status: 'error',
        category: 'provider_credentials',
        deviceNotRegistered: false,
      },
    ]);
    const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://exp.host/--/api/v2/push/send');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      authorization: 'Bearer secret',
      'content-type': 'application/json',
    });
    expect((JSON.parse(init.body as string) as unknown[])[0]).toEqual({
      to: message.to,
      title: message.title,
      body: message.body,
      sound: 'default',
      badge: 2,
      channelId: 'actionable',
      priority: 'high',
      data: message.data,
    });
  });

  it('omits the sound and authorization when neither applies', async () => {
    const fetch = respond(200, { data: [{ status: 'ok', id: 'ticket-1' }] });
    const provider = createExpoPushProvider({ fetch, accessToken: null });

    await provider.send([{ ...message, sound: null }]);

    const [, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(init.headers).not.toHaveProperty('authorization');
    expect(
      (JSON.parse(init.body as string) as unknown[])[0],
    ).not.toHaveProperty('sound');
  });

  it('refuses more than one hundred messages per request', async () => {
    const provider = createExpoPushProvider({
      fetch: jest.fn(),
      accessToken: null,
    });

    await expect(
      provider.send(Array.from({ length: 101 }, () => message)),
    ).rejects.toBeInstanceOf(PermanentPushError);
  });

  it('treats a network failure, 429, and 5xx as transient', async () => {
    const failing = createExpoPushProvider({
      fetch: jest.fn().mockRejectedValue(new TypeError('fetch failed')),
      accessToken: null,
    });
    await expect(failing.send([message])).rejects.toMatchObject({
      category: 'network',
    });

    const limited = createExpoPushProvider({
      fetch: respond(429, {}, { 'retry-after': '120' }),
      accessToken: null,
    });
    const error = await limited.send([message]).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(TransientPushError);
    expect(error).toMatchObject({
      category: 'rate_limited',
      retryAfterSeconds: 120,
    });

    const down = createExpoPushProvider({
      fetch: respond(503, {}),
      accessToken: null,
    });
    await expect(down.send([message])).rejects.toMatchObject({
      category: 'provider_unavailable',
    });
  });

  it('treats rejected credentials and requests as permanent', async () => {
    const unauthorized = createExpoPushProvider({
      fetch: respond(401, { errors: [{ code: 'UNAUTHORIZED' }] }),
      accessToken: 'wrong',
    });
    await expect(unauthorized.send([message])).rejects.toMatchObject({
      category: 'provider_authentication',
    });

    const rejected = createExpoPushProvider({
      fetch: respond(400, { errors: [{ code: 'VALIDATION_ERROR' }] }),
      accessToken: null,
    });
    const error = await rejected.send([message]).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PermanentPushError);
    expect(error).toMatchObject({ category: 'provider_rejected_request' });
  });

  it('treats a response that does not match the messages as permanent', async () => {
    const provider = createExpoPushProvider({
      fetch: respond(200, { data: [] }),
      accessToken: null,
    });

    await expect(provider.send([message])).rejects.toMatchObject({
      category: 'provider_response_invalid',
    });
  });

  it('reads receipts by ticket id', async () => {
    const fetch = respond(200, {
      data: {
        'ticket-1': { status: 'ok' },
        'ticket-2': {
          status: 'error',
          message: 'gone',
          details: { error: 'DeviceNotRegistered' },
        },
        'ticket-3': {
          status: 'error',
          message: 'too big',
          details: { error: 'MessageTooBig' },
        },
      },
    });
    const provider = createExpoPushProvider({ fetch, accessToken: null });

    const receipts = await provider.getReceipts([
      'ticket-1',
      'ticket-2',
      'ticket-3',
      'ticket-4',
    ]);

    expect([...receipts.entries()]).toEqual([
      ['ticket-1', { status: 'ok' }],
      [
        'ticket-2',
        {
          status: 'error',
          category: 'device_not_registered',
          deviceNotRegistered: true,
        },
      ],
      [
        'ticket-3',
        {
          status: 'error',
          category: 'message_too_big',
          deviceNotRegistered: false,
        },
      ],
    ]);
    const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://exp.host/--/api/v2/push/getReceipts');
    expect(JSON.parse(init.body as string)).toEqual({
      ids: ['ticket-1', 'ticket-2', 'ticket-3', 'ticket-4'],
    });
  });
});
