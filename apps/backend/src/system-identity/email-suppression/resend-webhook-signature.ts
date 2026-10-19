import { createHmac, timingSafeEqual } from 'node:crypto';

export type ResendWebhookHeaders = {
  id: string | undefined;
  timestamp: string | undefined;
  signature: string | undefined;
};

const toleranceSeconds = 5 * 60;

// ADR-0094: Resend signs webhooks with Svix's scheme, an HMAC-SHA256 over
// `id.timestamp.body` keyed by the base64 part of the `whsec_` secret.
export const verifyResendWebhookSignature = (
  secret: string,
  headers: ResendWebhookHeaders,
  body: Buffer,
  now: Date,
): boolean => {
  const { id, timestamp, signature } = headers;
  if (id === undefined || timestamp === undefined || signature === undefined) {
    return false;
  }
  const sentAt = Number(timestamp);
  if (
    !Number.isFinite(sentAt) ||
    Math.abs(now.getTime() / 1000 - sentAt) > toleranceSeconds
  ) {
    return false;
  }

  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const expected = createHmac('sha256', key)
    .update(`${id}.${timestamp}.`)
    .update(body)
    .digest();

  return signature.split(' ').some((entry) => {
    const [version, value] = entry.split(',');
    if (version !== 'v1' || value === undefined) return false;
    const candidate = Buffer.from(value, 'base64');
    return (
      candidate.length === expected.length &&
      timingSafeEqual(candidate, expected)
    );
  });
};
