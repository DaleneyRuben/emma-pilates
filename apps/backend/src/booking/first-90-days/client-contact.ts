import {
  visibleContactAlerts,
  type OpenContactAlert,
} from './list-contact-alerts';

/** One Client's Contact Alerts as the ficha reads them (BKM-013). */
export type ClientContactRecord = {
  onContactList: boolean;
  lastContactedAt: Date | null;
  lastContactedByAccountId: string | null;
};

export type LastContact = {
  contactedAt: Date;
  contactedByAccountId: string | null;
};

/**
 * Staff pick E4 A: one Client's contact state for her ficha. She is on the
 * list by the same rule as Para contactar (BKM-013); the last contact is the
 * latest alert a Staff Member marked.
 */
export const readClientContact = async (
  clientId: string,
  dependencies: {
    now: () => Date;
    today: (instant: Date) => Date;
    findOpen(clientId: string): Promise<OpenContactAlert[]>;
    findLastContact(clientId: string): Promise<LastContact | null>;
  },
): Promise<ClientContactRecord> => {
  const [open, last] = await Promise.all([
    dependencies.findOpen(clientId),
    dependencies.findLastContact(clientId),
  ]);
  const visible = visibleContactAlerts(
    open,
    dependencies.today(dependencies.now()),
  );
  return {
    onContactList: visible.some((item) => item.clientId === clientId),
    lastContactedAt: last?.contactedAt ?? null,
    lastContactedByAccountId: last?.contactedByAccountId ?? null,
  };
};
