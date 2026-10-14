import type { PushOutcome } from './push-provider';

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

export const checkPushReceipts = (
  dependencies: CheckPushReceiptsDependencies,
): Promise<CheckPushReceiptsResult> =>
  Promise.reject(new Error(`not implemented ${typeof dependencies}`));
