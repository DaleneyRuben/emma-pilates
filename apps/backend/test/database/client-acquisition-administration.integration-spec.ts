import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import {
  createPrismaClientAcquisitionStore,
  createPrismaTrainerReferralCodeStore,
} from '../../src/booking/acquisition/prisma-acquisition-stores';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const suffix = () => randomUUID().slice(0, 6).toUpperCase();
const occurredAt = new Date('2026-10-23T15:00:00.000Z');

// BKM-011: the Administrator corrects a Client's attribution on the Client
// detail and gives each Trainer her personal code.
describe('Acquisition administration (PostgreSQL)', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  let actorAccountId: string;

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({ adapter: new PrismaPg(context.pool) });
    const administrator = await prisma.staffMember.create({
      data: {
        name: 'Emma',
        role: 'ADMINISTRATOR',
        account: {
          create: {
            email: `emma-${randomUUID()}@example.com`,
            activatedAt: new Date(),
          },
        },
      },
      select: { account: { select: { id: true } } },
    });
    actorAccountId = administrator.account!.id;
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  const newClient = (name: string) =>
    prisma.client.create({
      data: { name, referralCode: `REF-${randomUUID()}` },
    });
  const newTrainer = (name: string, referralCode: string | null = null) =>
    prisma.staffMember.create({
      data: { name, role: 'TRAINER', referralCode },
    });
  const actor = () => ({
    accountId: actorAccountId,
    role: 'administrator' as const,
  });

  it('reads unknown for a Client registered before the question', async () => {
    const ana = await newClient('Ana Antigua');

    await expect(
      createPrismaClientAcquisitionStore(prisma).read(ana.id),
    ).resolves.toEqual({
      clientId: ana.id,
      declaredChannel: 'unknown',
      channel: 'unknown',
      referralCode: null,
      referrer: null,
    });
    await expect(
      createPrismaClientAcquisitionStore(prisma).read(randomUUID()),
    ).resolves.toBeNull();
  });

  it('corrects the attribution to a Trainer’s code, names the Trainer, and audits it', async () => {
    const code = `MAJO${suffix()}`;
    const trainer = await newTrainer('Majo Entrenadora', code);
    const bea = await newClient('Bea');
    await prisma.clientAcquisition.create({
      data: { clientId: bea.id, declaredChannel: 'GOOGLE', channel: 'GOOGLE' },
    });
    const store = createPrismaClientAcquisitionStore(prisma);

    await expect(
      store.correct({
        clientId: bea.id,
        declaredChannel: 'instagram',
        referralCode: code,
        actor: actor(),
        occurredAt,
      }),
    ).resolves.toEqual({
      clientId: bea.id,
      declaredChannel: 'instagram',
      channel: 'trainer',
      referralCode: code,
      referrer: { kind: 'trainer', id: trainer.id, name: 'Majo Entrenadora' },
    });
    await expect(
      prisma.clientAcquisition.count({
        where: { clientId: bea.id, deletedAt: null },
      }),
    ).resolves.toBe(1);
    await expect(
      prisma.auditRecord.findFirstOrThrow({
        where: { actionCode: 'client_acquisition.corrected', targetId: bea.id },
      }),
    ).resolves.toMatchObject({
      actorAccountId,
      actorRole: 'ADMINISTRATOR',
      targetType: 'client',
      metadata: {
        previousChannel: 'google',
        channel: 'trainer',
        previousReferralCode: null,
        referralCode: code,
      },
      occurredAt,
    });
  });

  it('creates the row for an older Client, keeps the channel without a code, and refuses unknown codes', async () => {
    const cata = await newClient('Cata');
    const store = createPrismaClientAcquisitionStore(prisma);

    await expect(
      store.correct({
        clientId: cata.id,
        declaredChannel: 'walk_in',
        referralCode: null,
        actor: actor(),
        occurredAt,
      }),
    ).resolves.toMatchObject({ channel: 'walk_in', referrer: null });
    await expect(
      store.correct({
        clientId: cata.id,
        declaredChannel: 'other',
        referralCode: 'NOBODY',
        actor: actor(),
        occurredAt,
      }),
    ).rejects.toMatchObject({ code: 'referral_code_invalid' });
    await expect(
      store.correct({
        clientId: randomUUID(),
        declaredChannel: 'other',
        referralCode: null,
        actor: actor(),
        occurredAt,
      }),
    ).resolves.toBeNull();
  });

  it('gives a Trainer her code, audits it, and refuses a code another Trainer or Client holds', async () => {
    const trainers = createPrismaTrainerReferralCodeStore(prisma);
    const sol = await newTrainer('Sol');
    const taken = `LUZ${suffix()}`;
    await newTrainer('Luz', taken);
    const clientCode = `CLI${suffix()}`;
    await prisma.client.create({
      data: { name: 'Clienta con código corto', referralCode: clientCode },
    });
    const code = `SOL${suffix()}`;

    await expect(trainers.find(sol.id)).resolves.toEqual({
      staffMemberId: sol.id,
      role: 'trainer',
      referralCode: null,
    });
    await expect(
      trainers.set({
        staffMemberId: sol.id,
        referralCode: code,
        previousReferralCode: null,
        actorAccountId,
        occurredAt,
      }),
    ).resolves.toEqual({ staffMemberId: sol.id, referralCode: code });
    await expect(
      prisma.auditRecord.findFirstOrThrow({
        where: {
          actionCode: 'staff_member.referral_code_changed',
          targetId: sol.id,
        },
      }),
    ).resolves.toMatchObject({
      targetType: 'staff_member',
      metadata: { previousReferralCode: null, referralCode: code },
    });

    for (const referralCode of [taken, clientCode]) {
      await expect(
        trainers.set({
          staffMemberId: sol.id,
          referralCode,
          previousReferralCode: code,
          actorAccountId,
          occurredAt,
        }),
      ).rejects.toMatchObject({ code: 'referral_code_in_use' });
    }
    await expect(trainers.find(randomUUID())).resolves.toBeNull();
  });
});
