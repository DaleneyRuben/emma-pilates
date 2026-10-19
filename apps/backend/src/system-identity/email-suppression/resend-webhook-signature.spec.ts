import { createHmac } from 'node:crypto';
import { verifyResendWebhookSignature } from './resend-webhook-signature';

const key = Buffer.from('a-webhook-signing-key-for-tests!');
const secret = `whsec_${key.toString('base64')}`;
const body = Buffer.from('{"type":"email.bounced"}');
const now = new Date('2026-10-19T15:00:00.000Z');
const timestamp = String(now.getTime() / 1000);

const sign = (id: string, at: string, payload: Buffer, signingKey = key) =>
  createHmac('sha256', signingKey)
    .update(`${id}.${at}.${payload.toString('utf8')}`)
    .digest('base64');

const headers = (overrides: Partial<Record<string, string>> = {}) => ({
  id: 'msg_1',
  timestamp,
  signature: `v1,${sign('msg_1', timestamp, body)}`,
  ...overrides,
});

describe('Resend webhook signature (Svix scheme)', () => {
  it('accepts a body signed with the endpoint secret', () => {
    expect(verifyResendWebhookSignature(secret, headers(), body, now)).toBe(
      true,
    );
  });

  it('accepts when any of several listed signatures matches', () => {
    const signature = `v1,${sign('msg_1', timestamp, body, Buffer.from('old-key'))} v1,${sign('msg_1', timestamp, body)}`;

    expect(
      verifyResendWebhookSignature(secret, headers({ signature }), body, now),
    ).toBe(true);
  });

  it('rejects a changed body, id, or signature', () => {
    expect(
      verifyResendWebhookSignature(
        secret,
        headers(),
        Buffer.from('{"type":"email.complained"}'),
        now,
      ),
    ).toBe(false);
    expect(
      verifyResendWebhookSignature(secret, headers({ id: 'msg_2' }), body, now),
    ).toBe(false);
    expect(
      verifyResendWebhookSignature(
        secret,
        headers({ signature: 'v1,bm90LWEtc2lnbmF0dXJl' }),
        body,
        now,
      ),
    ).toBe(false);
  });

  it('rejects a timestamp more than five minutes away', () => {
    const stale = String(now.getTime() / 1000 - 301);
    const signature = `v1,${sign('msg_1', stale, body)}`;

    expect(
      verifyResendWebhookSignature(
        secret,
        headers({ timestamp: stale, signature }),
        body,
        now,
      ),
    ).toBe(false);
  });

  it('rejects missing headers', () => {
    expect(
      verifyResendWebhookSignature(
        secret,
        { id: undefined, timestamp: undefined, signature: undefined },
        body,
        now,
      ),
    ).toBe(false);
  });
});
