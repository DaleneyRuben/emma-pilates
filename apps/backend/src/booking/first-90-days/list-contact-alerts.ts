import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { requireOperations } from '../administration/administration-errors';
import {
  hasBookedSince,
  isWithinFirstNinetyDays,
  type ContactAlertReason,
} from './first-90-days-alerts';

export type OpenContactAlert = {
  clientId: string;
  name: string;
  phone: string | null;
  startedOn: Date;
  reason: ContactAlertReason;
  openedAt: Date;
  bookedAt: Date[];
};

export type ContactAlertItem = {
  clientId: string;
  name: string;
  phone: string | null;
  startedOn: Date;
  reasons: ContactAlertReason[];
};

export const visibleContactAlerts = (
  rows: OpenContactAlert[],
  today: Date,
): ContactAlertItem[] => {
  const byClient = new Map<string, OpenContactAlert[]>();
  for (const row of rows) {
    if (!isWithinFirstNinetyDays(row.startedOn, today)) continue;
    const list = byClient.get(row.clientId) ?? [];
    list.push(row);
    byClient.set(row.clientId, list);
  }

  return [...byClient.values()]
    .flatMap((alerts) => {
      const sorted = [...alerts].sort(
        (left, right) => left.openedAt.getTime() - right.openedAt.getTime(),
      );
      const first = sorted[0];
      if (first === undefined) return [];
      if (hasBookedSince(first.openedAt, first.bookedAt)) return [];
      return [
        {
          clientId: first.clientId,
          name: first.name,
          phone: first.phone,
          startedOn: first.startedOn,
          reasons: sorted.map((alert) => alert.reason),
          oldestOpenedAt: first.openedAt,
        },
      ];
    })
    .sort(
      (left, right) =>
        left.oldestOpenedAt.getTime() - right.oldestOpenedAt.getTime(),
    )
    .map((item) => ({
      clientId: item.clientId,
      name: item.name,
      phone: item.phone,
      startedOn: item.startedOn,
      reasons: item.reasons,
    }));
};

type ListContactAlertsDependencies = {
  now: () => Date;
  today: (instant: Date) => Date;
  findOpen(): Promise<OpenContactAlert[]>;
};

export const listContactAlerts = async (
  principal: AuthenticatedPrincipal,
  dependencies: ListContactAlertsDependencies,
): Promise<{ items: ContactAlertItem[]; totalItems: number }> => {
  requireOperations(principal);
  const items = visibleContactAlerts(
    await dependencies.findOpen(),
    dependencies.today(dependencies.now()),
  );
  return { items, totalItems: items.length };
};
