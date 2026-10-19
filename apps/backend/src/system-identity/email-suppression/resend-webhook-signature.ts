export type ResendWebhookHeaders = {
  id: string | undefined;
  timestamp: string | undefined;
  signature: string | undefined;
};

// Red checkpoint stub: the verification is implemented in the next commit.
export const verifyResendWebhookSignature = (
  secret: string,
  headers: ResendWebhookHeaders,
  body: Buffer,
  now: Date,
): boolean => [secret, headers, body, now].length < 0;
