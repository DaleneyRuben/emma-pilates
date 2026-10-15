import { validateEnvironment } from './config/environment';
import { createDatabaseClients } from './database/database-clients';
import { AUTHENTICATION_EMAIL_QUEUE } from './jobs/authentication-email/authentication-email-job';
import { PrismaAuthenticationEmailStateReader } from './jobs/authentication-email/prisma-authentication-email-state-reader';
import { readQueuedLinkSecret } from './jobs/authentication-email/queued-link-secret';
import { startInstalledPgBoss } from './jobs/pg-boss-runtime';
import { verifyQueuedClientEmail } from './system-identity/registration/queued-client-verification';
import type { ClientEmailVerificationStatus } from './system-identity/registration/verify-client-email';
import { AuthenticationLinkCipher } from './system-identity/security/authentication-link-cipher';

// REL-006: until EXT-001 sends email, an operator confirms a registering
// Client's queued verification from the API's shell, through the API's own
// endpoint on this host; see docs/runbooks/mobile-release.md. The secret is
// never printed.
async function main(): Promise<void> {
  const email = process.argv[2];
  if (email === undefined || !email.includes('@')) {
    console.error(
      JSON.stringify({ event: 'client_email_verification_usage_error' }),
    );
    process.exitCode = 2;
    return;
  }

  const environment = validateEnvironment(process.env);
  const { prisma, boss } = createDatabaseClients(
    'client-email-verification',
    environment,
  );

  try {
    await startInstalledPgBoss(boss);
    const status = await verifyQueuedClientEmail({
      readSecret: () =>
        readQueuedLinkSecret({
          purpose: 'verification',
          recipient: email,
          queuedJobs: () =>
            boss.findJobs(AUTHENTICATION_EMAIL_QUEUE, {
              data: { purpose: 'verification' },
              queued: true,
            }),
          stateReader: new PrismaAuthenticationEmailStateReader(prisma),
          decryptor: new AuthenticationLinkCipher(
            environment.AUTHENTICATION_LINK_ENCRYPTION_KEY_ID,
            Buffer.from(
              environment.AUTHENTICATION_LINK_ENCRYPTION_KEY,
              'base64',
            ),
          ),
          now: new Date(),
        }),
      verify: async (verificationToken) => {
        const response = await fetch(
          `http://127.0.0.1:${environment.PORT}/api/v1/client-email-verifications`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ verificationToken }),
          },
        );
        if (!response.ok) {
          throw new Error(`Verification answered ${response.status}`);
        }
        const body = (await response.json()) as {
          status: ClientEmailVerificationStatus;
        };
        return body.status;
      },
    });
    console.log(JSON.stringify({ event: 'client_email_verification', status }));
    process.exitCode = status === 'verified' ? 0 : 1;
  } finally {
    await boss.stop({ graceful: true });
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      event: 'client_email_verification_failed',
      type: error instanceof Error ? error.name : typeof error,
      ...(error instanceof Error ? { message: error.message } : {}),
    }),
  );
  process.exitCode = 1;
});
