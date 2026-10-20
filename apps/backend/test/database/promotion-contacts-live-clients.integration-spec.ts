import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createPrismaPromotionContacts } from '../../src/booking/promotion-contacts/prisma-promotion-contacts';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const occurredAt = new Date('2026-10-20T14:00:00.000Z');
const at = (instant: string) => new Date(instant);

// BE-023 (ADR-0098): AW35 lists live Clients with an open Promotions Consent
// beside the former Clients' Promotion Contacts.
describe('Promotion Contacts with live Clients (PostgreSQL)', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  const store = () => createPrismaPromotionContacts(prisma);
  const actor = { accountId: randomUUID(), staffMemberId: randomUUID() };
  const ids = {
    lucia: randomUUID(),
    luciaConsent: randomUUID(),
    marta: randomUUID(),
    closed: randomUUID(),
    valeria: randomUUID(),
  };

  const liveClient = async (input: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    deletedAt?: Date;
  }) =>
    prisma.client.create({
      data: {
        id: input.id,
        name: input.name,
        phone: input.phone ?? null,
        referralCode: `REF-${input.id.slice(0, 8)}`,
        deletedAt: input.deletedAt ?? null,
        account: {
          create: {
            email: input.email,
            deletedAt: input.deletedAt ?? null,
          },
        },
      },
    });

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({ adapter: new PrismaPg(context.pool) });
    await prisma.staffMember.create({
      data: {
        id: actor.staffMemberId,
        name: 'Paola Mendoza',
        role: 'ADMINISTRATOR',
        account: {
          create: { id: actor.accountId, email: 'paola@example.com' },
        },
      },
    });
    await liveClient({
      id: ids.lucia,
      name: 'Lucía Fernández',
      email: 'lucia@example.com',
      phone: '+591 70033003',
    });
    await prisma.clientPromotionsConsent.create({
      data: {
        id: ids.luciaConsent,
        clientId: ids.lucia,
        consentedAt: at('2026-10-18T12:00:00Z'),
      },
    });
    await liveClient({
      id: ids.marta,
      name: 'Marta Rojas',
      email: 'marta@example.com',
    });
    await prisma.clientPromotionsConsent.create({
      data: {
        clientId: ids.marta,
        consentedAt: at('2026-10-10T12:00:00Z'),
        withdrawnAt: at('2026-10-11T12:00:00Z'),
      },
    });
    await liveClient({
      id: ids.closed,
      name: 'Cliente eliminado',
      email: `cerrada-${ids.closed}@cuentas-cerradas.invalid`,
      deletedAt: at('2026-10-15T12:00:00Z'),
    });
    await prisma.clientPromotionsConsent.create({
      data: {
        clientId: ids.closed,
        consentedAt: at('2026-10-12T12:00:00Z'),
        withdrawnAt: at('2026-10-15T12:00:00Z'),
        deletedAt: at('2026-10-15T12:00:00Z'),
      },
    });
    await prisma.promotionContact.create({
      data: {
        id: ids.valeria,
        name: 'Valeria Quiroga',
        email: 'valeria@example.com',
        consentedAt: at('2026-10-19T20:00:00Z'),
      },
    });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  const lucia = {
    id: ids.luciaConsent,
    kind: 'client',
    name: 'Lucía Fernández',
    email: 'lucia@example.com',
    phone: '+591 70033003',
    consentedAt: at('2026-10-18T12:00:00Z'),
  };

  it('lists open consents of live Clients beside former Clients, newest first', async () => {
    await expect(store().list({ page: 1, pageSize: 20 })).resolves.toEqual({
      items: [
        {
          id: ids.valeria,
          kind: 'former_client',
          name: 'Valeria Quiroga',
          email: 'valeria@example.com',
          phone: null,
          consentedAt: at('2026-10-19T20:00:00Z'),
        },
        lucia,
      ],
      page: 1,
      pageSize: 20,
      totalItems: 2,
    });
  });

  it('searches a live Client by name, email, and phone', async () => {
    const found = async (query: string) =>
      (await store().list({ page: 1, pageSize: 20, query })).items;
    await expect(found('LUCIA')).resolves.toEqual([lucia]);
    await expect(found('lucia@exa')).resolves.toEqual([lucia]);
    await expect(found('70033003')).resolves.toEqual([lucia]);
    await expect(found('marta')).resolves.toEqual([]);
  });

  it('exports both kinds', async () => {
    const all = await store().listAll();
    expect(all.map((row) => [row.kind, row.id])).toEqual([
      ['former_client', ids.valeria],
      ['client', ids.luciaConsent],
    ]);
  });

  it('withdraws a live Client consent without touching the Account, once', async () => {
    await expect(
      store().withdraw({ contactId: ids.luciaConsent, actor, occurredAt }),
    ).resolves.toBe(true);
    await expect(
      prisma.clientPromotionsConsent.findUniqueOrThrow({
        where: { id: ids.luciaConsent },
        select: { withdrawnAt: true, deletedAt: true },
      }),
    ).resolves.toEqual({ withdrawnAt: occurredAt, deletedAt: null });
    await expect(
      prisma.client.findUniqueOrThrow({
        where: { id: ids.lucia },
        select: {
          name: true,
          phone: true,
          account: { select: { email: true } },
        },
      }),
    ).resolves.toEqual({
      name: 'Lucía Fernández',
      phone: '+591 70033003',
      account: { email: 'lucia@example.com' },
    });
    await expect(
      prisma.auditRecord.findFirst({
        where: { actionCode: 'promotions_consent.withdrawn' },
        select: {
          actorAccountId: true,
          actorRole: true,
          targetType: true,
          targetId: true,
          metadata: true,
        },
      }),
    ).resolves.toEqual({
      actorAccountId: actor.accountId,
      actorRole: 'ADMINISTRATOR',
      targetType: 'client_promotions_consent',
      targetId: ids.luciaConsent,
      metadata: { clientId: ids.lucia },
    });
    await expect(
      store().withdraw({ contactId: ids.luciaConsent, actor, occurredAt }),
    ).resolves.toBe(false);
    await expect(
      store().list({ page: 1, pageSize: 20 }),
    ).resolves.toMatchObject({ totalItems: 1 });
  });
});
