import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createPrismaTrainerReferralCodeStore } from '../../src/booking/acquisition/prisma-acquisition-stores';
import { createPrismaOwnReferralCodeStore } from '../../src/booking/acquisition/prisma-own-referral-code-store';
import { findReferralCodeHolder } from '../../src/booking/acquisition/record-client-acquisition';
import { claimReadableReferralCode } from '../../src/booking/acquisition/referral-code-claim';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const occurredAt = new Date('2026-11-03T15:00:00.000Z');

// BKM-017 (owner 2026-11-02): readable codes from the name, one registry for
// Client and Trainer codes, and attribution by the code's live holder.
describe('Readable Referral Codes (PostgreSQL)', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({ adapter: new PrismaPg(context.pool) });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  const claim = (name: string) =>
    prisma.$transaction((transaction) =>
      claimReadableReferralCode(transaction, name),
    );
  const newClient = async (name: string) =>
    prisma.client.create({
      data: { name, referralCode: await claim(name) },
    });
  const newTrainer = async (name: string) =>
    prisma.staffMember.create({
      data: { name, role: 'TRAINER', referralCode: await claim(name) },
    });

  it('builds the code from the first name, then the surname, then a number', async () => {
    await expect(newClient('Lucía Fernández')).resolves.toMatchObject({
      referralCode: 'LUCIA',
    });
    await expect(newTrainer('lucía fernández')).resolves.toMatchObject({
      referralCode: 'FERNANDEZ',
    });
    await expect(newClient('Lucía Fernández')).resolves.toMatchObject({
      referralCode: 'LUCIA2',
    });
    await expect(newClient('LUCÍA de los Ángeles')).resolves.toMatchObject({
      referralCode: 'ANGELES',
    });
    await expect(newClient('Lucía')).resolves.toMatchObject({
      referralCode: 'LUCIA3',
    });
  });

  it('skips reserved words and keeps short names readable', async () => {
    await expect(claim('Emma Rojas')).resolves.toBe('ROJAS');
    await expect(claim('Li Wong')).resolves.toBe('LIWONG');
    await expect(claim('  ')).resolves.toBe('AMIGA');
  });

  it('keeps one code unique across Clients and Trainers, retired ones too', async () => {
    const sofia = await newClient('Sofía Guzmán');
    await expect(
      prisma.staffMember.create({
        data: { name: 'Sofía', role: 'TRAINER', referralCode: 'SOFIA' },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });

    await prisma.client.update({
      where: { id: sofia.id },
      data: { referralCode: 'SOFI-PILATES' },
    });
    await expect(
      prisma.client.create({ data: { name: 'Otra', referralCode: 'SOFIA' } }),
    ).rejects.toMatchObject({ code: 'P2002' });
    await expect(claim('Sofía Vargas')).resolves.toBe('VARGAS');

    // Her old code is hers to take back.
    await prisma.client.update({
      where: { id: sofia.id },
      data: { referralCode: 'SOFIA' },
    });
    await expect(
      prisma.referralCode.findMany({
        where: { clientId: sofia.id },
        select: { code: true, retiredAt: true },
        orderBy: { code: 'asc' },
      }),
    ).resolves.toEqual([
      { code: 'SOFI-PILATES', retiredAt: expect.any(Date) as Date },
      { code: 'SOFIA', retiredAt: null },
    ]);
  });

  it('attributes by the live holder, so an old code stops working', async () => {
    const valeria = await newClient('Valeria Quiroga');
    const daniela = await newTrainer('Daniela Ortiz');

    await prisma.$transaction(async (transaction) => {
      await expect(
        findReferralCodeHolder(transaction, 'VALERIA'),
      ).resolves.toEqual({ kind: 'client', clientId: valeria.id });
      await expect(
        findReferralCodeHolder(transaction, 'DANIELA'),
      ).resolves.toEqual({ kind: 'trainer', staffMemberId: daniela.id });
    });

    await prisma.client.update({
      where: { id: valeria.id },
      data: { referralCode: 'VALE' },
    });
    await prisma.$transaction(async (transaction) => {
      await expect(
        findReferralCodeHolder(transaction, 'VALERIA'),
      ).resolves.toBeNull();
      await expect(
        findReferralCodeHolder(transaction, 'VALE'),
      ).resolves.toEqual({ kind: 'client', clientId: valeria.id });
    });
  });

  it('reads, checks, and changes her own code with its audit record', async () => {
    const isabel = await newClient('Isabel Arce');
    await newClient('Mariana Peña');
    const account = await prisma.account.create({
      data: {
        email: `isabel-${randomUUID()}@example.com`,
        clientId: isabel.id,
        activatedAt: occurredAt,
      },
    });
    const holder = { kind: 'client' as const, clientId: isabel.id };
    const store = createPrismaOwnReferralCodeStore(prisma);

    await expect(store.find(holder)).resolves.toEqual({
      referralCode: 'ISABEL',
      changedAt: null,
    });
    await expect(store.status('MARIANA', holder)).resolves.toBe('in_use');
    await expect(store.status('EMMA-VIP', holder)).resolves.toBe('blocked');
    await expect(store.status('LAPUTA1', holder)).resolves.toBe('blocked');
    await expect(store.status('ISA-PILATES', holder)).resolves.toBe(
      'available',
    );

    await store.change({
      holder,
      referralCode: 'ISA-PILATES',
      previousReferralCode: 'ISABEL',
      previousChangedAt: null,
      actorAccountId: account.id,
      occurredAt,
    });

    await expect(store.find(holder)).resolves.toEqual({
      referralCode: 'ISA-PILATES',
      changedAt: occurredAt,
    });
    // Her retired code stays hers: nobody else gets it.
    await expect(store.status('ISABEL', holder)).resolves.toBe('available');
    await expect(
      store.status('ISABEL', { kind: 'client', clientId: randomUUID() }),
    ).resolves.toBe('in_use');
    await expect(
      prisma.auditRecord.findFirstOrThrow({
        where: {
          actionCode: 'client.referral_code_changed',
          targetId: isabel.id,
        },
      }),
    ).resolves.toMatchObject({
      actorAccountId: account.id,
      actorRole: null,
      targetType: 'client',
      metadata: { previousReferralCode: 'ISABEL', referralCode: 'ISA-PILATES' },
      occurredAt,
    });
  });

  // Two devices saving at once: only one change counts inside the 30 days.
  it('lets only one of two simultaneous changes through', async () => {
    const rosa = await newClient('Rosa Paredes');
    const account = await prisma.account.create({
      data: {
        email: `rosa-${randomUUID()}@example.com`,
        clientId: rosa.id,
        activatedAt: occurredAt,
      },
    });
    const holder = { kind: 'client' as const, clientId: rosa.id };
    const store = createPrismaOwnReferralCodeStore(prisma);
    const change = (referralCode: string) =>
      store.change({
        holder,
        referralCode,
        previousReferralCode: 'ROSA',
        previousChangedAt: null,
        actorAccountId: account.id,
        occurredAt,
      });

    const results = await Promise.allSettled([
      change('ROSA-UNO'),
      change('ROSA-DOS'),
    ]);

    expect(results.map(({ status }) => status).sort()).toEqual([
      'fulfilled',
      'rejected',
    ]);
    expect(
      results.find(({ status }) => status === 'rejected'),
    ).toMatchObject({ reason: { code: 'referral_code_change_too_soon' } });
  });

  it('refuses the owner a blocked or retired code for a Trainer', async () => {
    const andrea = await newTrainer('Andrea Suárez');
    const retired = await newClient('Paula Mendoza');
    await prisma.client.update({
      where: { id: retired.id },
      data: { referralCode: 'PAULI' },
    });
    const administrator = await prisma.staffMember.create({
      data: {
        name: 'Paola',
        role: 'ADMINISTRATOR',
        account: {
          create: { email: `paola-${randomUUID()}@example.com` },
        },
      },
      select: { account: { select: { id: true } } },
    });
    const input = {
      staffMemberId: andrea.id,
      previousReferralCode: 'ANDREA',
      actorAccountId: administrator.account!.id,
      occurredAt,
    };
    const store = createPrismaTrainerReferralCodeStore(prisma);

    await expect(
      store.set({ ...input, referralCode: 'ADMIN-ANDREA' }),
    ).rejects.toMatchObject({ code: 'referral_code_blocked' });
    await expect(
      store.set({ ...input, referralCode: 'PAULA' }),
    ).rejects.toMatchObject({ code: 'referral_code_in_use' });
    await expect(
      store.set({ ...input, referralCode: 'ANDRE' }),
    ).resolves.toEqual({ staffMemberId: andrea.id, referralCode: 'ANDRE' });
  });
});
