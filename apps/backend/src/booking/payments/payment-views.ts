import {
  PaymentMethod,
  PaymentState,
  PurchaseIntentState,
  type Prisma,
} from '../../generated/prisma/client';
import { deprecatedDurationMonths } from '../catalog/plan-validity';

// The read models the payment commands return, and the selects and
// mappers that build them from Payment and Purchase Intent rows.
export type PurchaseIntentView = {
  id: string;
  planId: string;
  planName: string;
  durationDays: number;
  durationMonths: number;
  classAllowance: number;
  planPriceCentavos: number;
  creditReservedCentavos: number;
  discountCentavos: number;
  discountReason: string | null;
  amountDueCentavos: number;
  state: 'open' | 'submitted' | 'expired';
  receiptAttached: boolean;
  createdAt: Date;
  expiresAt: Date;
  startsOn: string;
};

export type PaymentView = {
  id: string;
  method: 'transfer' | 'cash' | 'credit_only' | 'courtesy';
  state: 'pending' | 'confirmed' | 'rejected' | 'voided';
  planId: string;
  planName: string;
  durationDays: number;
  durationMonths: number;
  classAllowance: number;
  planPriceCentavos: number;
  creditAppliedCentavos: number;
  discountCentavos: number;
  discountReason: string | null;
  amountDueCentavos: number;
  startsOn: string;
  submittedAt: Date;
  decidedAt: Date | null;
  rejectionReason: string | null;
  subscriptionId: string | null;
};

export type CreditActivityEntry = {
  id: string;
  kind:
    | 'referral_award'
    | 'payment_reservation'
    | 'payment_spend'
    | 'payment_release';
  amountCentavos: number;
  occurredAt: Date;
};

export type InvitationStatus = 'registered' | 'class_booked' | 'bought';

export type ReferralsView = {
  referralCode: string;
  referrals: {
    referredClientId: string;
    referredName: string;
    state: 'pending' | 'awarded';
    invitationStatus: InvitationStatus;
    createdAt: Date;
    awardedAt: Date | null;
    awardCentavos: number | null;
  }[];
};

export type PendingPaymentSummary = {
  id: string;
  clientName: string;
  planName: string;
  amountDueCentavos: number;
  submittedAt: Date;
  receiptAvailable: boolean;
};

export type PaymentReview = PaymentView & {
  clientName: string;
  receipt: { imageAssetId: string; mediaType: string } | null;
};

const intentStates: Record<PurchaseIntentState, PurchaseIntentView['state']> = {
  [PurchaseIntentState.OPEN]: 'open',
  [PurchaseIntentState.SUBMITTED]: 'submitted',
  [PurchaseIntentState.EXPIRED]: 'expired',
};
export const paymentMethods: Record<PaymentMethod, PaymentView['method']> = {
  [PaymentMethod.TRANSFER]: 'transfer',
  [PaymentMethod.CASH]: 'cash',
  [PaymentMethod.CREDIT_ONLY]: 'credit_only',
  [PaymentMethod.COURTESY]: 'courtesy',
};
const paymentStates: Record<PaymentState, PaymentView['state']> = {
  [PaymentState.PENDING]: 'pending',
  [PaymentState.CONFIRMED]: 'confirmed',
  [PaymentState.REJECTED]: 'rejected',
  [PaymentState.VOIDED]: 'voided',
};

export const intentSelect = {
  id: true,
  clientId: true,
  planId: true,
  planNameSnapshot: true,
  durationDaysSnapshot: true,
  weeklyClassCapSnapshot: true,
  classAllowanceSnapshot: true,
  planPriceCentavos: true,
  creditReservedCentavos: true,
  discountCentavos: true,
  discountReason: true,
  amountDueCentavos: true,
  receiptImageAssetId: true,
  startsOn: true,
  state: true,
  createdAt: true,
  expiresAt: true,
} as const;

export const paymentSelect = {
  id: true,
  clientId: true,
  planId: true,
  purchaseIntentId: true,
  planNameSnapshot: true,
  durationDaysSnapshot: true,
  weeklyClassCapSnapshot: true,
  classAllowanceSnapshot: true,
  planPriceCentavos: true,
  creditAppliedCentavos: true,
  discountCentavos: true,
  discountReason: true,
  amountDueCentavos: true,
  startsOn: true,
  method: true,
  state: true,
  kind: true,
  submittedAt: true,
  decidedAt: true,
  rejectionReason: true,
  subscription: { select: { id: true } },
  plan: { select: { hiddenAt: true } },
} as const;

export type IntentRow = Prisma.PurchaseIntentGetPayload<{
  select: typeof intentSelect;
}>;
export type PaymentRow = Prisma.PaymentGetPayload<{
  select: typeof paymentSelect;
}>;

export const toIntentView = (row: IntentRow): PurchaseIntentView => ({
  id: row.id,
  planId: row.planId,
  planName: row.planNameSnapshot,
  durationDays: row.durationDaysSnapshot,
  durationMonths: deprecatedDurationMonths(row.durationDaysSnapshot),
  classAllowance: row.classAllowanceSnapshot,
  planPriceCentavos: row.planPriceCentavos,
  creditReservedCentavos: row.creditReservedCentavos,
  discountCentavos: row.discountCentavos,
  discountReason: row.discountReason,
  amountDueCentavos: row.amountDueCentavos,
  state: intentStates[row.state],
  receiptAttached: row.receiptImageAssetId !== null,
  createdAt: row.createdAt,
  expiresAt: row.expiresAt,
  startsOn: row.startsOn.toISOString().slice(0, 10),
});

export const toPaymentView = (row: PaymentRow): PaymentView => ({
  id: row.id,
  method: paymentMethods[row.method],
  state: paymentStates[row.state],
  planId: row.planId,
  planName: row.planNameSnapshot,
  durationDays: row.durationDaysSnapshot,
  durationMonths: deprecatedDurationMonths(row.durationDaysSnapshot),
  classAllowance: row.classAllowanceSnapshot,
  planPriceCentavos: row.planPriceCentavos,
  creditAppliedCentavos: row.creditAppliedCentavos,
  discountCentavos: row.discountCentavos,
  discountReason: row.discountReason,
  amountDueCentavos: row.amountDueCentavos,
  startsOn: row.startsOn.toISOString().slice(0, 10),
  submittedAt: row.submittedAt,
  decidedAt: row.decidedAt,
  rejectionReason: row.rejectionReason,
  subscriptionId: row.subscription?.id ?? null,
});
