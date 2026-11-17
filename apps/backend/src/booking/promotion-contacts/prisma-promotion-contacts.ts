import { randomUUID } from 'node:crypto';
import {
  AuditActorKind,
  AuditOutcome,
  Prisma,
  type PrismaClient,
} from '../../generated/prisma/client';
import type { AdministratorActor } from '../administration/administration-errors';
import { containsPattern } from '../search-pattern';
import type {
  PromotionContactFilter,
  PromotionContactKind,
  PromotionContactRow,
  PromotionContactStore,
} from './promotion-contacts';

export const withdrawnContactName = 'Contacto retirado';
export const withdrawnContactEmail = (contactId: string): string =>
  `retirado-${contactId}@contactos-retirados.invalid`;

// The same accent- and case-insensitive match as the Client directory, and
// one kind when asked (FIX-065).
const filterCondition = ({
  query,
  kind,
}: PromotionContactFilter): Prisma.Sql => {
  const ofKind =
    kind === undefined ? Prisma.empty : Prisma.sql`AND kind = ${kind}`;
  if (query === undefined) return ofKind;
  const pattern = containsPattern(query);
  return Prisma.sql`${ofKind} AND (booking.search_text(name) LIKE booking.search_text(${pattern})
    OR booking.search_text(email) LIKE booking.search_text(${pattern})
    OR phone ILIKE ${pattern})`;
};

// FIX-060 (walkthrough finding 85): former Clients' Promotion Contacts and
// every live Client of the directory, whatever her Promotions Consent says,
// read with her current name, email, and phone, as one list.
const contacts = Prisma.sql`(
  SELECT id, 'former_client' AS kind, name, email, phone, consented_at AS since
  FROM booking.promotion_contacts
  WHERE deleted_at IS NULL AND withdrawn_at IS NULL
  UNION ALL
  SELECT client.id, 'client', client.name, account.email, client.phone,
    client.created_at
  FROM booking.clients client
  JOIN system.accounts account
    ON account.client_id = client.id AND account.deleted_at IS NULL
  WHERE client.deleted_at IS NULL
) AS contacts`;

type ContactRecord = {
  id: string;
  kind: PromotionContactKind;
  name: string;
  email: string;
  phone: string | null;
  since: Date;
};

const toRow = (record: ContactRecord): PromotionContactRow => ({
  id: record.id,
  kind: record.kind,
  name: record.name,
  email: record.email,
  phone: record.phone,
  since: record.since,
});

const audit = (
  actor: AdministratorActor,
  input: {
    actionCode: 'promotion_contact.exported' | 'promotion_contact.withdrawn';
    targetType: 'promotion_contact';
    targetId: string | null;
    metadata: Prisma.InputJsonObject;
    occurredAt: Date;
  },
): Prisma.AuditRecordUncheckedCreateInput => ({
  actionCode: input.actionCode,
  outcome: AuditOutcome.SUCCEEDED,
  actorKind: AuditActorKind.ACCOUNT,
  actorAccountId: actor.audit.accountId,
  actorRole: actor.audit.role,
  impersonationId: actor.audit.impersonationId,
  targetType: input.targetType,
  targetId: input.targetId,
  correlationId: randomUUID(),
  metadata: input.metadata,
  occurredAt: input.occurredAt,
});

// BE-022: the Promotion Contacts of ADR-0097, newest first.
export const createPrismaPromotionContacts = (
  prisma: PrismaClient,
): PromotionContactStore => ({
  list: async ({ page, pageSize, ...filter }) => {
    const search = filterCondition(filter);
    const [records, [counted]] = await Promise.all([
      prisma.$queryRaw<ContactRecord[]>`
        SELECT id, kind, name, email, phone, since
        FROM ${contacts}
        WHERE TRUE ${search}
        ORDER BY since DESC, id
        LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
      prisma.$queryRaw<{ total: bigint }[]>`
        SELECT count(*) AS total
        FROM ${contacts}
        WHERE TRUE ${search}`,
    ]);
    return {
      items: records.map(toRow),
      page,
      pageSize,
      totalItems: Number(counted?.total ?? 0),
    };
  },

  listAll: async (filter = {}) => {
    const records = await prisma.$queryRaw<ContactRecord[]>`
      SELECT id, kind, name, email, phone, since
      FROM ${contacts}
      WHERE TRUE ${filterCondition(filter)}
      ORDER BY since DESC, id`;
    return records.map(toRow);
  },

  recordExport: async ({ actor, contactCount, kind, occurredAt }) => {
    await prisma.auditRecord.create({
      data: audit(actor, {
        actionCode: 'promotion_contact.exported',
        targetType: 'promotion_contact',
        targetId: null,
        metadata:
          kind === undefined ? { contactCount } : { contactCount, kind },
        occurredAt,
      }),
    });
  },

  // A Promotion Contact keeps its row but loses its personal data (ADR-0086).
  // A live Client is never withdrawn (FIX-060): her id finds nothing here.
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
          targetType: 'promotion_contact',
          targetId: contactId,
          metadata: {},
          occurredAt,
        }),
      });
      return true;
    }),
});
