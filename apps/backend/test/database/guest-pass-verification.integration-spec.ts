import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { openGuestPass } from '../../src/booking/payments/open-guest-pass';
import { RegisterClient } from '../../src/system-identity/registration/register-client';
import { PrismaClientRegistrationUnitOfWork } from '../../src/system-identity/registration/prisma-client-registration-unit-of-work';
import { VerifyClientEmail } from '../../src/system-identity/registration/verify-client-email';
import { PrismaAccountSecurityGateway } from '../../src/system-identity/account-security/prisma-account-security-gateway';
import { AuthenticationLinkCipher } from '../../src/system-identity/security/authentication-link-cipher';
import { authenticationTokens } from '../../src/system-identity/security/authentication-token-service';
import {
  AUTHENTICATION_EMAIL_QUEUE,
  parseAuthenticationEmailJob,
} from '../../src/jobs/authentication-email/authentication-email-job';
import { applyDevelopmentFixtures } from '../../src/development-fixtures/apply-development-fixtures';
import { buildDevelopmentFixtures } from '../../src/development-fixtures/development-fixtures';
import {
  digestTestEmail,
  startRegistrationWorld,
  type RegistrationWorld,
} from './client-registration-test-support';

const code = () =>
  `REF-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;

const now = new Date(Date.now() + 60_000);
const today = new Date(
  Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
);

// An unverified registration must not spend the host's monthly invite.
// The pass opens when the email is verified. The monthly limit never fails
// registration, and two concurrent verifications cannot both consume it.
describe('guest pass opens at email verification', () => {
  let world: RegistrationWorld;
  let prisma: PrismaClient;

  beforeAll(async () => {
    world = await startRegistrationWorld();
    prisma = world.prisma;
    await applyDevelopmentFixtures(prisma, {
      fixtures: buildDevelopmentFixtures({ today }),
      passwordHash: 'not-a-real-hash',
    });
  });

  afterAll(async () => {
    await world?.stop();
  });

  const register = (email: string, referralCode: string) => {
    const gateway = new PrismaClientRegistrationUnitOfWork({
      prisma,
      boss: world.boss,
      digestEmail: digestTestEmail,
      now: () => now,
    });
    return new RegisterClient({
      unitOfWork: gateway,
      passwordHasher: {
        hash: () => Promise.resolve('argon2id-password-hash'),
      },
      tokenIssuer: authenticationTokens,
      linkCipher: new AuthenticationLinkCipher(
        'local-test-key',
        Buffer.alloc(32, 7),
      ),
      now: () => now,
      newId: randomUUID,
      newReferralCode: () => `REF-${randomUUID()}`,
    }).execute({
      name: 'Amiga nueva',
      email,
      password: 'correct horse battery staple',
      referralCode,
    });
  };

  const verify = async (email: string) => {
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
    const cipher = new AuthenticationLinkCipher(
      'local-test-key',
      Buffer.alloc(32, 7),
    );
    const secret = await cipher.decrypt(
      job.encryptedLinkSecret,
      job.encryptionKeyId,
    );
    const gateway = new PrismaClientRegistrationUnitOfWork({
      prisma,
      boss: world.boss,
      digestEmail: digestTestEmail,
      now: () => now,
    });
    return new VerifyClientEmail({
      gateway,
      tokens: authenticationTokens,
      now: () => now,
    }).execute({ verificationToken: secret });
  };

  it('keeps the monthly invite until the friend verifies her email', async () => {
    const host = await prisma.client.create({
      data: {
        name: 'Anfitriona de registro',
        referralCode: code(),
      },
      select: { id: true, referralCode: true },
    });
    const email = `unverified-${randomUUID()}@example.com`;

    await register(email, host.referralCode);

    await expect(
      prisma.guestPass.count({
        where: { hostClientId: host.id, deletedAt: null },
      }),
    ).resolves.toBe(0);

    await expect(verify(email)).resolves.toEqual({ status: 'verified' });
    await expect(
      prisma.guestPass.count({
        where: { hostClientId: host.id, deletedAt: null },
      }),
    ).resolves.toBe(1);
  });

  it('registers a second friend the same month even when the invite is already used', async () => {
    const host = await prisma.client.create({
      data: {
        name: 'Anfitriona ocupada',
        referralCode: code(),
      },
    });
    const author = await prisma.account.findFirstOrThrow({
      where: { email: 'emma.vargas@example.com', deletedAt: null },
      select: { id: true },
    });
    const taken = await prisma.client.create({
      data: { name: 'Ya invitada', referralCode: `REF-${randomUUID()}` },
    });
    await prisma.$transaction((transaction) =>
      openGuestPass(transaction, {
        hostClientId: host.id,
        friendClientId: taken.id,
        authorAccountId: author.id,
        now,
      }),
    );

    const email = `second-${randomUUID()}@example.com`;
    await expect(register(email, host.referralCode)).resolves.toEqual(
      expect.objectContaining({ email }),
    );
    await expect(
      prisma.guestPass.count({
        where: { hostClientId: host.id, deletedAt: null },
      }),
    ).resolves.toBe(1);
  });

  it('verifies a second friend when the monthly limit message changes', async () => {
    const host = await prisma.client.create({
      data: { name: 'Anfitriona texto', referralCode: code() },
    });
    const author = await prisma.account.findFirstOrThrow({
      where: { email: 'emma.vargas@example.com', deletedAt: null },
      select: { id: true },
    });
    const taken = await prisma.client.create({
      data: { name: 'Ya invitada texto', referralCode: `REF-${randomUUID()}` },
    });
    await prisma.$transaction((transaction) =>
      openGuestPass(transaction, {
        hostClientId: host.id,
        friendClientId: taken.id,
        authorAccountId: author.id,
        now,
      }),
    );
    const email = `wording-${randomUUID()}@example.com`;
    await expect(register(email, host.referralCode)).resolves.toEqual(
      expect.objectContaining({ email }),
    );
    await expect(verify(email)).resolves.toEqual({ status: 'verified' });
  });

  it('opens one pass when two friends verify at the same time', async () => {
    const host = await prisma.client.create({
      data: {
        name: 'Anfitriona concurrente',
        referralCode: code(),
      },
    });
    const first = `race-a-${randomUUID()}@example.com`;
    const second = `race-b-${randomUUID()}@example.com`;
    await register(first, host.referralCode);
    await register(second, host.referralCode);

    const raced = await Promise.allSettled([verify(first), verify(second)]);
    expect(raced).toEqual([
      { status: 'fulfilled', value: { status: 'verified' } },
      { status: 'fulfilled', value: { status: 'verified' } },
    ]);

    await expect(
      prisma.guestPass.count({
        where: { hostClientId: host.id, deletedAt: null },
      }),
    ).resolves.toBe(1);
  });

  it('opens the pass when an invited friend activates her account', async () => {
    const host = await prisma.client.create({
      data: {
        name: 'Anfitriona de invitación',
        referralCode: code(),
      },
    });
    const friend = await prisma.client.create({
      data: { name: 'Invitada pendiente', referralCode: `REF-${randomUUID()}` },
    });
    const account = await prisma.account.create({
      data: {
        email: `invited-${randomUUID()}@example.com`,
        clientId: friend.id,
        pendingExpiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1_000),
      },
      select: { id: true },
    });
    await prisma.clientAcquisition.create({
      data: {
        clientId: friend.id,
        declaredChannel: 'FRIEND',
        channel: 'FRIEND',
        referralCode: host.referralCode,
        referrerClientId: host.id,
      },
    });
    const tokenDigest = Buffer.from(randomUUID());
    await prisma.authenticationToken.create({
      data: {
        accountId: account.id,
        purpose: 'ACTIVATION',
        tokenDigest,
        issuedAt: new Date(now.getTime() - 60_000),
        expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1_000),
      },
    });

    await new PrismaAccountSecurityGateway(prisma).activateAccount({
      tokenDigest,
      passwordHash: 'argon2id-password-hash',
      completedAt: now,
    });

    await expect(
      prisma.guestPass.findFirst({
        where: {
          hostClientId: host.id,
          friendClientId: friend.id,
          deletedAt: null,
        },
      }),
    ).resolves.toEqual(expect.objectContaining({ hostClientId: host.id }));
  });
});
