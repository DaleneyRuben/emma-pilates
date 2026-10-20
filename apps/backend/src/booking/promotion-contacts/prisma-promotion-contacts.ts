import { randomUUID } from 'node:crypto';
import {
  AuditActorKind,
  AuditOutcome,
  Prisma,
  StaffRole,
  type PrismaClient,
} from '../../generated/prisma/client';
import type { AdministratorActor } from '../administration/administration-errors';
import { containsPattern } from '../search-pattern';
import type {
  PromotionContactRow,
  PromotionContactStore,
} from './promotion-contacts';

export const withdrawnContactName = 'Contacto retirado';
export const withdrawnContactEmail = (contactId: string): string =>
  `retirado-${contactId}@contactos-retirados.invalid`;

// The same accent- and case-insensitive match as the Client directory.
const searchCondition = (query: string | undefined): Prisma.Sql => {
  if (query === undefined) return Prisma.empty;
  const pattern = containsPattern(query);
  return Prisma.sql`AND (booking.search_text(name) LIKE booking.search_text(${pattern})
    OR booking.search_text(email) LIKE booking.search_text(${pattern})
    OR phone ILIKE ${pattern})`;
};

const live = Prisma.sql`deleted_at IS NULL AND withdrawn_at IS NULL`;

type ContactRecord = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  consented_at: Date;
};

const toRow = (record: ContactRecord): PromotionContactRow => ({
  id: record.id,
  name: record.name,
  email: record.email,
  phone: record.phone,
  consentedAt: record.consented_at,
});

const audit = (
  actor: AdministratorActor,
  input: {
    actionCode: 'promotion_contact.exported' | 'promotion_contact.withdrawn';
    targetId: string | null;
    metadata: Prisma.InputJsonObject;
    occurredAt: Date;
  },
): Prisma.AuditRecordUncheckedCreateInput => ({
  actionCode: input.actionCode,
  outcome: AuditOutcome.SUCCEEDED,
  actorKind: AuditActorKind.ACCOUNT,
  actorAccountId: actor.accountId,
  actorRole: StaffRole.ADMINISTRATOR,
  targetType: 'promotion_contact',
  targetId: input.targetId,
  correlationId: randomUUID(),
  metadata: input.metadata,
  occurredAt: input.occurredAt,
});

// BE-022: the Promotion Contacts of ADR-0097, newest consent first.
export const createPrismaPromotionContacts = (
  prisma: PrismaClient,
): PromotionContactStore => ({
  list: async ({ page, pageSize, query }) => {
    const search = searchCondition(query);
    const [records, [counted]] = await Promise.all([
      prisma.$queryRaw<ContactRecord[]>`
        SELECT id, name, email, phone, consented_at
        FROM booking.promotion_contacts
        WHERE ${live} ${search}
        ORDER BY consented_at DESC, id
        LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
      prisma.$queryRaw<{ total: bigint }[]>`
        SELECT count(*) AS total
        FROM booking.promotion_contacts
        WHERE ${live} ${search}`,
    ]);
    return {
      items: records.map(toRow),
      page,
      pageSize,
      totalItems: Number(counted?.total ?? 0),
    };
  },

  listAll: async () => {
    const records = await prisma.$queryRaw<ContactRecord[]>`
      SELECT id, name, email, phone, consented_at
      FROM booking.promotion_contacts
      WHERE ${live}
      ORDER BY consented_at DESC, id`;
    return records.map(toRow);
  },

  recordExport: async ({ actor, contactCount, occurredAt }) => {
    await prisma.auditRecord.create({
      data: audit(actor, {
        actionCode: 'promotion_contact.exported',
        targetId: null,
        metadata: { contactCount },
        occurredAt,
      }),
    });
  },

  // The row stays soft-deletable (ADR-0086); only its personal data goes.
  withdraw: ({ contactId, actor, occurredAt }) =>
    prisma.$transaction(async (transaction) => {
      const { count } = await transaction.promotionContact.updateMany({
        where: { id: contactId, deletedAt: null, withdrawnAt: null },
        data: {
          withdrawnAt: occurredAt,
          name: withdrawnContactName,
          email: withdrawnContactEmail(contactId),
          phone: null,
        },
      });
      if (count === 0) return false;
      await transaction.auditRecord.create({
        data: audit(actor, {
          actionCode: 'promotion_contact.withdrawn',
          targetId: contactId,
          metadata: {},
          occurredAt,
        }),
      });
      return true;
    }),
});
