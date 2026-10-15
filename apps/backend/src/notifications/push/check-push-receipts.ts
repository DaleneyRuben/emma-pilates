import {
  maxReceiptIdsPerRequest,
  TransientPushError,
  type PushOutcome,
} from './push-provider';

export type SubmittedDelivery = {
  deliveryId: string;
  deviceId: string;
  ticketId: string;
};

export type CheckedDelivery = SubmittedDelivery & {
  outcome: PushOutcome | null;
};

export type CheckPushReceiptsDependencies = {
  discardUnconfirmed: (submittedBefore: Date, at: Date) => Promise<number>;
  findSubmitted: (input: {
    submittedBefore: Date;
    limit: number;
  }) => Promise<SubmittedDelivery[]>;
  getReceipts: (ticketIds: string[]) => Promise<Map<string, PushOutcome>>;
  recordReceipts: (deliveries: CheckedDelivery[], at: Date) => Promise<void>;
  now: () => Date;
};

export type CheckPushReceiptsResult = {
  discarded: number;
  checked: number;
  delivered: number;
  failed: number;
};

const receiptDelayMs = 15 * 60_000;
const confirmationWindowMs = 24 * 60 * 60_000;

// ADR-0025: a ticket only says Expo accepted the message; its receipt, ready
// some minutes later, says whether Apple or Google took it. A receipt still
// missing after a day will not come, so the delivery is discarded.
export const checkPushReceipts = async (
  dependencies: CheckPushReceiptsDependencies,
): Promise<CheckPushReceiptsResult> => {
  const at = dependencies.now();
  const discarded = await dependencies.discardUnconfirmed(
    new Date(at.getTime() - confirmationWindowMs),
    at,
  );
  const result = { discarded, checked: 0, delivered: 0, failed: 0 };
  const submitted = await dependencies.findSubmitted({
    submittedBefore: new Date(at.getTime() - receiptDelayMs),
    limit: maxReceiptIdsPerRequest,
  });
  if (submitted.length === 0) return result;

  let receipts: Map<string, PushOutcome>;
  try {
    receipts = await dependencies.getReceipts(
      submitted.map(({ ticketId }) => ticketId),
    );
  } catch (error) {
    // The next sweep asks again.
    if (error instanceof TransientPushError) return result;
    throw error;
  }

  const checked = submitted.map((delivery) => ({
    ...delivery,
    outcome: receipts.get(delivery.ticketId) ?? null,
  }));
  await dependencies.recordReceipts(checked, at);

  return {
    discarded,
    checked: checked.length,
    delivered: checked.filter(({ outcome }) => outcome?.status === 'ok').length,
    failed: checked.filter(({ outcome }) => outcome?.status === 'error').length,
  };
};
