import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createPrismaPromotionContacts } from '../../src/booking/promotion-contacts/prisma-promotion-contacts';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const occurredAt = new Date('2026-10-20T14:00:00.000Z');

describe('Promotion Contacts (PostgreSQL)', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  const store = () => createPrismaPromotionContacts(prisma);
  const actor = { accountId: randomUUID(), staffMemberId: randomUUID() };
  const ids = {
    valeria: randomUUID(),
    sofia: randomUUID(),
    ana: randomUUID(),
    withdrawn: randomUUID(),
    removed: randomUUID(),
  };

  const contact = (input: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    consentedAt: string;
    withdrawnAt?: Date;
    deletedAt?: Date;
  }) =>
    prisma.promotionContact.create({
      data: {
        id: input.id,
        name: input.name,
        email: input.email,
        phone: input.phone ?? null,
        consentedAt: new Date(input.consentedAt),
        withdrawnAt: input.withdrawnAt ?? null,
        deletedAt: input.deletedAt ?? null,
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
    await contact({
      id: ids.valeria,
      name: 'Valeria Quiroga',
      email: 'valeria@example.com',
      phone: '+591 70011005',
      consentedAt: '2026-10-19T20:00:00.000Z',
    });
    await contact({
      id: ids.sofia,
      name: 'Sofía Guzmán',
      email: 'sofia@example.com',
      consentedAt: '2026-10-18T20:00:00.000Z',
    });
    await contact({
      id: ids.ana,
      name: 'Ana Rojas',
      email: 'ana@example.com',
      phone: '+591 70022002',
      consentedAt: '2026-10-17T20:00:00.000Z',
    });
    await contact({
      id: ids.withdrawn,
      name: 'Contacto retirado',
      email: `retirado-${ids.withdrawn}@contactos-retirados.invalid`,
      consentedAt: '2026-10-16T20:00:00.000Z',
      withdrawnAt: new Date('2026-10-17T12:00:00.000Z'),
    });
    await contact({
      id: ids.removed,
      name: 'Marta Removed',
      email: 'marta@example.com',
      consentedAt: '2026-10-15T20:00:00.000Z',
      deletedAt: new Date('2026-10-16T12:00:00.000Z'),
    });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  it('pages live contacts by newest consent, without withdrawn or removed ones', async () => {
    await expect(store().list({ page: 1, pageSize: 2 })).resolves.toEqual({
      items: [
        {
          id: ids.valeria,
          name: 'Valeria Quiroga',
          email: 'valeria@example.com',
          phone: '+591 70011005',
          consentedAt: new Date('2026-10-19T20:00:00.000Z'),
        },
        {
          id: ids.sofia,
          name: 'Sofía Guzmán',
          email: 'sofia@example.com',
          phone: null,
          consentedAt: new Date('2026-10-18T20:00:00.000Z'),
        },
      ],
      page: 1,
      pageSize: 2,
      totalItems: 3,
    });
    const second = await store().list({ page: 2, pageSize: 2 });
    expect(second.items.map((row) => row.id)).toEqual([ids.ana]);
  });

  it('searches name accents and case ignored, email, and phone', async () => {
    const names = async (query: string) =>
      (await store().list({ page: 1, pageSize: 20, query })).items.map(
        (row) => row.name,
      );
    await expect(names('SOFIA')).resolves.toEqual(['Sofía Guzmán']);
    await expect(names('ana@exa')).resolves.toEqual(['Ana Rojas']);
    await expect(names('70011005')).resolves.toEqual(['Valeria Quiroga']);
    await expect(names('marta')).resolves.toEqual([]);
  });

  it('exports every live contact and audits the export', async () => {
    const all = await store().listAll();
    expect(all.map((row) => row.id)).toEqual([ids.valeria, ids.sofia, ids.ana]);
    await store().recordExport({ actor, contactCount: 3, occurredAt });
    await expect(
      prisma.auditRecord.findFirst({
        where: { actionCode: 'promotion_contact.exported' },
        select: {
          outcome: true,
          actorAccountId: true,
          actorRole: true,
          targetType: true,
          targetId: true,
          metadata: true,
          occurredAt: true,
        },
      }),
    ).resolves.toEqual({
      outcome: 'SUCCEEDED',
      actorAccountId: actor.accountId,
      actorRole: 'ADMINISTRATOR',
      targetType: 'promotion_contact',
      targetId: null,
      metadata: { contactCount: 3 },
      occurredAt,
    });
  });

  it('withdraws a contact by erasing its details, once', async () => {
    await expect(
      store().withdraw({ contactId: ids.ana, actor, occurredAt }),
    ).resolves.toBe(true);
    await expect(
      prisma.promotionContact.findUniqueOrThrow({
        where: { id: ids.ana },
        select: {
          name: true,
          email: true,
          phone: true,
          withdrawnAt: true,
          deletedAt: true,
        },
      }),
    ).resolves.toEqual({
      name: 'Contacto retirado',
      email: `retirado-${ids.ana}@contactos-retirados.invalid`,
      phone: null,
      withdrawnAt: occurredAt,
      deletedAt: null,
    });
    await expect(
      prisma.auditRecord.findFirst({
        where: { actionCode: 'promotion_contact.withdrawn' },
        select: { targetType: true, targetId: true, actorAccountId: true },
      }),
    ).resolves.toEqual({
      targetType: 'promotion_contact',
      targetId: ids.ana,
      actorAccountId: actor.accountId,
    });
    await expect(
      store().withdraw({ contactId: ids.ana, actor, occurredAt }),
    ).resolves.toBe(false);
    await expect(
      store().withdraw({ contactId: ids.removed, actor, occurredAt }),
    ).resolves.toBe(false);
    await expect(
      store().withdraw({ contactId: randomUUID(), actor, occurredAt }),
    ).resolves.toBe(false);
    await expect(
      prisma.auditRecord.count({
        where: { actionCode: 'promotion_contact.withdrawn' },
      }),
    ).resolves.toBe(1);
  });
});
