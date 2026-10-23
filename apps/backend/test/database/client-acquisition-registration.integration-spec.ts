import { randomUUID } from 'node:crypto';
import { PgBoss } from 'pg-boss';
import { PrismaClient } from '../../src/generated/prisma/client';
import { PrismaClientRegistrationUnitOfWork } from '../../src/system-identity/registration/prisma-client-registration-unit-of-work';
import {
  RegisterClient,
  type RegisterClientCommand,
} from '../../src/system-identity/registration/register-client';
import { AuthenticationLinkCipher } from '../../src/system-identity/security/authentication-link-cipher';
import { authenticationTokens } from '../../src/system-identity/security/authentication-token-service';
import {
  digestTestEmail,
  RegistrationWorld,
  startRegistrationWorld,
} from './client-registration-test-support';

const suffix = () => randomUUID().slice(0, 6).toUpperCase();

// BKM-011: a self-registration stores her Acquisition Channel, and a
// Referral Code wins over it.
describe('Client acquisition at self-registration (PostgreSQL)', () => {
  let world: RegistrationWorld;
  let prisma: PrismaClient;
  let boss: PgBoss;

  beforeAll(async () => {
    world = await startRegistrationWorld();
    ({ prisma, boss } = world);
  });

  afterAll(async () => {
    await world?.stop();
  });

  const register = async (command: Omit<RegisterClientCommand, 'password'>) => {
    const result = await new RegisterClient({
      unitOfWork: new PrismaClientRegistrationUnitOfWork({
        prisma,
        boss,
        digestEmail: digestTestEmail,
      }),
      passwordHasher: { hash: () => Promise.resolve('password-hash') },
      tokenIssuer: authenticationTokens,
      linkCipher: new AuthenticationLinkCipher(
        'local-test-key',
        Buffer.alloc(32, 7),
      ),
      now: () => new Date(Date.now() + 60_000),
      newId: randomUUID,
      newReferralCode: () => `REF-${randomUUID()}`,
    }).execute({ ...command, password: 'correct horse battery staple' });
    const account = await prisma.account.findFirstOrThrow({
      where: { email: result.email, deletedAt: null },
      select: { clientId: true },
    });
    return prisma.clientAcquisition.findFirstOrThrow({
      where: { clientId: account.clientId!, deletedAt: null },
    });
  };

  const email = () => `acquisition-${randomUUID()}@example.com`;

  it('attributes a Client registered with a Trainer code to that Trainer, whatever channel she picked', async () => {
    const code = `CARLA${suffix()}`;
    const trainer = await prisma.staffMember.create({
      data: { name: 'Carla Entrenadora', role: 'TRAINER', referralCode: code },
    });

    await expect(
      register({
        name: 'Alumna de Carla',
        email: email(),
        acquisitionChannel: 'instagram',
        referralCode: code.toLowerCase(),
      }),
    ).resolves.toMatchObject({
      declaredChannel: 'INSTAGRAM',
      channel: 'TRAINER',
      referralCode: code,
      referrerStaffMemberId: trainer.id,
      referrerClientId: null,
    });
  });

  it('attributes a friend’s code to the friend and keeps her Referral', async () => {
    const friend = await prisma.client.create({
      data: { name: 'Lucía Amiga', referralCode: `REF-LUCIA-${suffix()}` },
    });

    const acquisition = await register({
      name: 'Amiga de Lucía',
      email: email(),
      acquisitionChannel: 'google',
      referralCode: friend.referralCode,
    });

    expect(acquisition).toMatchObject({
      declaredChannel: 'GOOGLE',
      channel: 'FRIEND',
      referrerClientId: friend.id,
      referrerStaffMemberId: null,
    });
    await expect(
      prisma.referral.count({ where: { referrerClientId: friend.id } }),
    ).resolves.toBe(1);
  });

  it('stores unknown for an older store build that sends no channel', async () => {
    await expect(
      register({ name: 'Versión Vieja', email: email() }),
    ).resolves.toMatchObject({
      declaredChannel: 'UNKNOWN',
      channel: 'UNKNOWN',
      referralCode: null,
    });
  });

  it('refuses a code nobody holds, a removed Trainer’s, or another Role’s, and creates nothing', async () => {
    const removedCode = `GONE${suffix()}`;
    await prisma.staffMember.create({
      data: {
        name: 'Ex Entrenadora',
        role: 'TRAINER',
        referralCode: removedCode,
        deletedAt: new Date(),
      },
    });
    const assistantCode = `ASIS${suffix()}`;
    await prisma.staffMember.create({
      data: {
        name: 'Asistente',
        role: 'ASSISTANT',
        referralCode: assistantCode,
      },
    });

    for (const referralCode of ['NOBODY-HAS-IT', removedCode, assistantCode]) {
      const address = email();
      await expect(
        register({
          name: 'Sin Código',
          email: address,
          acquisitionChannel: 'other',
          referralCode,
        }),
      ).rejects.toMatchObject({ code: 'referral_code_invalid' });
      await expect(
        prisma.account.findFirst({ where: { email: address } }),
      ).resolves.toBeNull();
    }
  });
});
