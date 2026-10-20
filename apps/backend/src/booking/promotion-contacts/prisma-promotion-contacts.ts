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
  PromotionContactKind,
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

// BE-023 (ADR-0098): former Clients' Promotion Contacts and live Clients'
// open Promotions Consents, read with the Client's current name, email, and
// phone, as one list.
const contacts = Prisma.sql`(
  SELECT id, 'former_client' AS kind, name, email, phone, consented_at
  FROM booking.promotion_contacts
  WHERE deleted_at IS NULL AND withdrawn_at IS NULL
  UNION ALL
  SELECT consent.id, 'client', client.name, account.email, client.phone,
    consent.consented_at
  FROM booking.client_promotions_consents consent
  JOIN booking.clients client
    ON client.id = consent.client_id AND client.deleted_at IS NULL
  JOIN system.accounts account
    ON account.client_id = client.id AND account.deleted_at IS NULL
  WHERE consent.withdrawn_at IS NULL AND consent.deleted_at IS NULL
) AS contacts`;

type ContactRecord = {
  id: string;
  kind: PromotionContactKind;
  name: string;
  email: string;
  phone: string | null;
  consented_at: Date;
};

const toRow = (record: ContactRecord): PromotionContactRow => ({
  id: record.id,
  kind: record.kind,
  name: record.name,
  email: record.email,
  phone: record.phone,
  consentedAt: record.consented_at,
});

const audit = (
  actor: AdministratorActor,
  input: {
    actionCode:
      | 'promotion_contact.exported'
      | 'promotion_contact.withdrawn'
      | 'promotions_consent.withdrawn';
    targetType: 'promotion_contact' | 'client_promotions_consent';
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
  targetType: input.targetType,
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
        SELECT id, kind, name, email, phone, consented_at
        FROM ${contacts}
        WHERE TRUE ${search}
        ORDER BY consented_at DESC, id
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

  listAll: async () => {
    const records = await prisma.$queryRaw<ContactRecord[]>`
      SELECT id, kind, name, email, phone, consented_at
      FROM ${contacts}
      ORDER BY consented_at DESC, id`;
    return records.map(toRow);
  },

  recordExport: async ({ actor, contactCount, occurredAt }) => {
    await prisma.auditRecord.create({
      data: audit(actor, {
        actionCode: 'promotion_contact.exported',
        targetType: 'promotion_contact',
        targetId: null,
        metadata: { contactCount },
        occurredAt,
      }),
    });
  },

  // A Promotion Contact keeps its row but loses its personal data (ADR-0086);
  // a live Client's consent only closes, and their Account stays as it is.
  withdraw: ({ contactId, actor, occurredAt }) =>
    prisma.$transaction(async (transaction) => {
      const [consent] = await transaction.$queryRaw<{ client_id: string }[]>`
        UPDATE booking.client_promotions_consents
        SET withdrawn_at = ${occurredAt}
        WHERE id = ${contactId}::uuid
          AND withdrawn_at IS NULL AND deleted_at IS NULL
        RETURNING client_id`;
      if (consent !== undefined) {
        await transaction.auditRecord.create({
          data: audit(actor, {
            actionCode: 'promotions_consent.withdrawn',
            targetType: 'client_promotions_consent',
            targetId: contactId,
            metadata: { clientId: consent.client_id },
            occurredAt,
          }),
        });
        return true;
      }
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
