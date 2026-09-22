import type { PrismaClient } from '../../generated/prisma/client';
import {
  summarizeCredit,
  type CreditLedgerKind,
} from '../payments/credit-summary';
import type {
  AssistantClientSummary,
  ClientAccountStatus,
} from './assistant-clients';

export type AssistantClientRepository = {
  searchClients(input: {
    query: string;
    limit: number;
  }): Promise<AssistantClientSummary[]>;
  findClient(clientId: string): Promise<AssistantClientSummary | null>;
  readAvailableCredit(clientId: string): Promise<number>;
};

const clientSelect = {
  id: true,
  name: true,
  phone: true,
  account: {
    select: {
      email: true,
      activatedAt: true,
      emailVerifiedAt: true,
      disabledAt: true,
    },
  },
} as const;

type ClientRow = {
  id: string;
  name: string;
  phone: string | null;
  account: {
    email: string;
    activatedAt: Date | null;
    emailVerifiedAt: Date | null;
    disabledAt: Date | null;
  } | null;
};

const accountStatus = (
  account: NonNullable<ClientRow['account']>,
): ClientAccountStatus => {
  if (account.disabledAt !== null) return 'disabled';
  return account.activatedAt !== null || account.emailVerifiedAt !== null
    ? 'active'
    : 'pending';
};

// Clients without an Account are unreachable for the studio and stay hidden.
const toSummary = (row: ClientRow): AssistantClientSummary | null =>
  row.account === null
    ? null
    : {
        id: row.id,
        name: row.name,
        email: row.account.email,
        phone: row.phone,
        accountStatus: accountStatus(row.account),
      };

const present = <Value>(value: Value | null): value is Value => value !== null;

export const createAssistantClientRepository = (
  prisma: PrismaClient,
): AssistantClientRepository => ({
  searchClients: ({ query, limit }) =>
    prisma.client
      .findMany({
        where: {
          account: { isNot: null },
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { phone: { contains: query, mode: 'insensitive' } },
            {
              account: {
                is: { email: { contains: query, mode: 'insensitive' } },
              },
            },
          ],
        },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        take: limit,
        select: clientSelect,
      })
      .then((rows) => rows.map(toSummary).filter(present)),
  findClient: (clientId) =>
    prisma.client
      .findUnique({ where: { id: clientId }, select: clientSelect })
      .then((row) => (row === null ? null : toSummary(row))),
  readAvailableCredit: (clientId) =>
    prisma.creditLedgerEntry
      .findMany({
        where: { clientId },
        select: { kind: true, amountCentavos: true },
      })
      .then(
        (entries) =>
          summarizeCredit(
            entries.map((entry) => ({
              kind: entry.kind.toLowerCase() as CreditLedgerKind,
              amountCentavos: entry.amountCentavos,
            })),
          ).availableCentavos,
      ),
});
