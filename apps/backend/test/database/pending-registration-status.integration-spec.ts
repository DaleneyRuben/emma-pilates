import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { readPendingRegistrationStatus } from '../../src/system-identity/registration/prisma-pending-registration-status';
import { PrismaClientRegistrationUnitOfWork } from '../../src/system-identity/registration/prisma-client-registration-unit-of-work';
import { PrismaClientInvitationUnitOfWork } from '../../src/system-identity/invitations/prisma-client-invitation-unit-of-work';
import { RegisterClient } from '../../src/system-identity/registration/register-client';
import { VerifyClientEmail } from '../../src/system-identity/registration/verify-client-email';
import {
  AUTHENTICATION_EMAIL_QUEUE,
  parseAuthenticationEmailJob,
} from '../../src/jobs/authentication-email/authentication-email-job';
import { AuthenticationLinkCipher } from '../../src/system-identity/security/authentication-link-cipher';
import { authenticationTokens } from '../../src/system-identity/security/authentication-token-service';
import {
  digestTestEmail,
  RegistrationWorld,
  startRegistrationWorld,
} from './client-registration-test-support';

const now = new Date(Date.now() + 60_000);

// Walkthrough n.º 4 (C01c2): «Revisa tu correo» asks on opening whether the
// email was confirmed meanwhile (on another phone or in a browser), and then
// leads to Login instead of waiting.
describe('the status of a pending Client registration', () => {
  let world: RegistrationWorld;
  let prisma: PrismaClient;

  beforeAll(async () => {
    world = await startRegistrationWorld();
    prisma = world.prisma;
  });

  afterAll(async () => {
    await world?.stop();
  });

  const register = () =>
    new RegisterClient({
      unitOfWork: new PrismaClientRegistrationUnitOfWork({
        prisma,
        boss: world.boss,
        digestEmail: digestTestEmail,
        now: () => now,
      }),
      passwordHasher: { hash: () => Promise.resolve('argon2id-hash') },
      tokenIssuer: authenticationTokens,
      linkCipher: new AuthenticationLinkCipher(
        'local-test-key',
        Buffer.alloc(32, 7),
      ),
      now: () => now,
      newId: randomUUID,
    }).execute({
      name: 'Carla Pendiente',
      email: `carla-${randomUUID()}@example.com`,
      password: 'correct horse battery staple',
    });

  // Confirms the email the way the link does, so every token is handled as
  // in production (review: verification invalidates the continuation).
  const confirm = async (email: string) => {
    const account = await prisma.account.findFirstOrThrow({
      where: { email, deletedAt: null },
      select: { id: true },
    });
    const jobs = await world.boss.findJobs(AUTHENTICATION_EMAIL_QUEUE, {
      id: undefined,
    });
    const job = parseAuthenticationEmailJob(
      jobs.find(
        ({ data }) =>
          typeof data === 'object' &&
          data !== null &&
          'accountId' in data &&
          data.accountId === account.id,
      )?.data,
    );
    const secret = await new AuthenticationLinkCipher(
      'local-test-key',
      Buffer.alloc(32, 7),
    ).decrypt(job.encryptedLinkSecret, job.encryptionKeyId);
    await new VerifyClientEmail({
      gateway: new PrismaClientRegistrationUnitOfWork({
        prisma,
        boss: world.boss,
        digestEmail: digestTestEmail,
        now: () => now,
      }),
      tokens: authenticationTokens,
      now: () => now,
    }).execute({ verificationToken: secret });
  };

  const statusOf = (registrationContinuation: string, at = now) =>
    readPendingRegistrationStatus(prisma, {
      registrationContinuation,
      now: at,
      digestEmail: digestTestEmail,
    });

  const suppress = async (
    email: string,
    reason: 'HARD_BOUNCE' | 'COMPLAINT',
    resolved = false,
  ) => {
    const resolver = resolved
      ? await prisma.account.findFirstOrThrow({
          where: { email },
          select: { id: true },
        })
      : null;
    await prisma.emailSuppression.create({
      data: {
        emailDigest: new Uint8Array(digestTestEmail(email)),
        reason,
        provider: 'resend',
        providerEventId: `event-${randomUUID()}`,
        providerOccurredAt: now,
        ...(resolver === null
          ? {}
          : {
              resolvedAt: now,
              resolvedByAccountId: resolver.id,
              resolutionReason: 'address_fixed',
            }),
      },
    });
  };

  it('answers pending while the email waits for its link', async () => {
    const { registrationContinuation } = await register();

    await expect(statusOf(registrationContinuation)).resolves.toBe('pending');
  });

  it('answers verified once the email was confirmed', async () => {
    const { email, registrationContinuation } = await register();
    await confirm(email);

    await expect(statusOf(registrationContinuation)).resolves.toBe('verified');
  });

  it('answers expired for an unknown continuation or after the window', async () => {
    const { registrationContinuation } = await register();

    await expect(statusOf('not-a-continuation')).resolves.toBe('expired');
    await expect(
      statusOf(
        registrationContinuation,
        new Date(now.getTime() + 8 * 24 * 60 * 60 * 1_000),
      ),
    ).resolves.toBe('expired');
  });

  // Walkthrough n.º 2 (C01c3): the verification email bounced (Resend's
  // hard bounce, already kept by the webhook), so the address is wrong.
  it('answers bounced when the address hard-bounced', async () => {
    const { email, registrationContinuation } = await register();
    await suppress(email, 'HARD_BOUNCE');

    await expect(statusOf(registrationContinuation)).resolves.toBe('bounced');
  });

  it('keeps pending for a complaint or a resolved bounce', async () => {
    const first = await register();
    await suppress(first.email, 'COMPLAINT');
    const second = await register();
    await suppress(second.email, 'HARD_BOUNCE', true);

    await expect(statusOf(first.registrationContinuation)).resolves.toBe(
      'pending',
    );
    await expect(statusOf(second.registrationContinuation)).resolves.toBe(
      'pending',
    );
  });

  // RW-clientas-ficha-correo-rebotado: the Clientas file asks the same
  // question about a pending Client's address.
  it('tells the Clientas file the same about a pending address', async () => {
    const bounced = await register();
    await suppress(bounced.email, 'HARD_BOUNCE');
    const quiet = await register();
    const isBounced = (email: string) =>
      new PrismaClientInvitationUnitOfWork({
        prisma,
        boss: world.boss,
        digestEmail: digestTestEmail,
      }).execute((transaction) => transaction.isEmailBounced(email));

    await expect(isBounced(bounced.email)).resolves.toBe(true);
    await expect(isBounced(quiet.email)).resolves.toBe(false);
  });
});
