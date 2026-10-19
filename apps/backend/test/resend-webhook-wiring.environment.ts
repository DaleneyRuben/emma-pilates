// Imported first by resend-webhook-wiring.e2e-spec.ts: AppModule reads the
// environment when it loads, so the secret must exist before that import.
process.env.RESEND_WEBHOOK_SECRET = `whsec_${Buffer.from('wiring-test-key').toString('base64')}`;
