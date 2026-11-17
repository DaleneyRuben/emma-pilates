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

// FIX-060 (walkthrough finding 85): AW35 lists every live Client, whether or
// not she agreed in Perfil, beside the former Clients' Promotion Contacts.
describe('Promotion Contacts with live Clients (PostgreSQL)', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  const store = () => createPrismaPromotionContacts(prisma);
  const accountId = randomUUID();
  const actor = {
    accountId,
    staffMemberId: randomUUID(),
    audit: { accountId, role: 'ADMINISTRATOR' as const, impersonationId: null },
  };
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
    createdAt: Date;
    deletedAt?: Date;
  }) =>
    prisma.client.create({
      data: {
        id: input.id,
        name: input.name,
        phone: input.phone ?? null,
        referralCode: `REF-${input.id.slice(0, 8)}`,
        createdAt: input.createdAt,
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
      createdAt: at('2026-09-01T12:00:00Z'),
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
      createdAt: at('2026-08-01T12:00:00Z'),
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
      createdAt: at('2026-10-01T12:00:00Z'),
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

  const valeria = {
    id: ids.valeria,
    kind: 'former_client',
    name: 'Valeria Quiroga',
    email: 'valeria@example.com',
    phone: null,
    since: at('2026-10-19T20:00:00Z'),
  };
  const lucia = {
    id: ids.lucia,
    kind: 'client',
    name: 'Lucía Fernández',
    email: 'lucia@example.com',
    phone: '+591 70033003',
    since: at('2026-09-01T12:00:00Z'),
  };
  const marta = {
    id: ids.marta,
    kind: 'client',
    name: 'Marta Rojas',
    email: 'marta@example.com',
    phone: null,
    since: at('2026-08-01T12:00:00Z'),
  };

  it('lists every live Client, consent or not, beside former Clients, newest first', async () => {
    await expect(store().list({ page: 1, pageSize: 20 })).resolves.toEqual({
      items: [valeria, lucia, marta],
      page: 1,
      pageSize: 20,
      totalItems: 3,
    });
  });

  it('searches a live Client by name, email, and phone', async () => {
    const found = async (query: string) =>
      (await store().list({ page: 1, pageSize: 20, query })).items;
    await expect(found('LUCIA')).resolves.toEqual([lucia]);
    await expect(found('lucia@exa')).resolves.toEqual([lucia]);
    await expect(found('70033003')).resolves.toEqual([lucia]);
    await expect(found('marta')).resolves.toEqual([marta]);
    await expect(found('eliminado')).resolves.toEqual([]);
  });

  it('exports both kinds', async () => {
    const all = await store().listAll();
    expect(all.map((row) => [row.kind, row.id])).toEqual([
      ['former_client', ids.valeria],
      ['client', ids.lucia],
      ['client', ids.marta],
    ]);
  });

  it('leaves a live Client and her consent alone when asked to withdraw her', async () => {
    await expect(
      store().withdraw({ contactId: ids.lucia, actor, occurredAt }),
    ).resolves.toBe(false);
    await expect(
      store().withdraw({ contactId: ids.luciaConsent, actor, occurredAt }),
    ).resolves.toBe(false);
    await expect(
      prisma.clientPromotionsConsent.findUniqueOrThrow({
        where: { id: ids.luciaConsent },
        select: { withdrawnAt: true, deletedAt: true },
      }),
    ).resolves.toEqual({ withdrawnAt: null, deletedAt: null });
    await expect(
      store().list({ page: 1, pageSize: 20 }),
    ).resolves.toMatchObject({ totalItems: 3 });
  });
});
