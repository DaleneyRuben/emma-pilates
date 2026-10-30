import { campaignAuthorizationRows } from './campaign-authorization';
import { catalogAuthorizationRows } from './catalog-authorization';
import { evaluationAuthorizationRows } from './evaluation-authorization';
import { payStatementAuthorizationRows } from './pay-statement-authorization';
import { studioFactsAuthorizationRows } from './studio-facts-authorization';
import { supplyMovementAuthorizationRows } from './supply-movement-authorization';
import type { RealIds } from './authorization-matrix-support';

// IDN-009 / ADR-0102: every endpoint the API serves, with an explicit
// decision for the Administrator and the Coordinator. «allow» means the Role
// passes authorization (the request may still fail on its data); «deny»
// means 403. The Coordinator is denied by default: an endpoint is «allow» for
// her only for the operation she runs (the schedule, Sessions, Bookings on a
// Client's behalf, Client profiles, Staff details) or her own Account.
// `authorization-matrix.integration-spec.ts` fails when a route is missing
// here, when a row names a route that no longer exists, or when the API
// answers differently.

export type Access = 'allow' | 'deny';

export type { RealIds } from './authorization-matrix-support';

export type MatrixRow = {
  administrator: Access;
  coordinator: Access;
  /**
   * The body sent instead of the sample built from the OpenAPI schema, where
   * a controller validates before it authorizes.
   */
  body?: Record<string, unknown> | ((ids: RealIds) => Record<string, unknown>);
  query?: string;
  /** Fill the path with the spec's real Session, Booking, and Waitlist rows. */
  realIds?: true | Partial<Record<string, keyof RealIds>>;
  /** Authorized by ownership, not by Role: both Roles must answer alike. */
  ownerScoped?: true;
  /** Sends image bytes instead of JSON. */
  rawBody?: true;
  /**
   * The handler reads the row before the Role, so a missing identifier is
   * 404 for both. That 404 is the denial this probe can reach.
   */
  missingResource?: true;
  /**
   * The Staff app calls this with a bearer credential. The probe otherwise
   * sends the admin cookie on `/administrator/` paths only, and a cookie on
   * an assistant path never becomes a session.
   */
  bearer?: true;
  /**
   * A 403 with this problem code is a data rule after the Role passed
   * (a receipt the caller does not own), so the probe counts it as allow.
   */
  passedCode?: string;
  /**
   * Needs no credential: any answer but 403 passes, a refused Login (401)
   * included.
   */
  public?: true;
};

/** The front desk's work on a Client's behalf: never the Administrator's. */
const coordinatorOnly = (extra: Partial<MatrixRow> = {}): MatrixRow => ({
  administrator: 'deny',
  coordinator: 'allow',
  ...extra,
});
const both = (access: Access, extra: Partial<MatrixRow> = {}): MatrixRow => ({
  administrator: access,
  coordinator: access,
  ...extra,
});
/** The Administrator's money and access decisions: never the Coordinator's. */
const administratorOnly = (extra: Partial<MatrixRow> = {}): MatrixRow => ({
  administrator: 'allow',
  coordinator: 'deny',
  ...extra,
});

const uuid = '00000000-0000-4000-8000-000000000000';
const publicRoute: MatrixRow = {
  administrator: 'allow',
  coordinator: 'allow',
  public: true,
};

export const authorizationMatrix: Record<string, MatrixRow> = {
  // Public: no credential is needed, so no Role is refused.
  'GET /health/live': publicRoute,
  'GET /health/ready': publicRoute,
  'POST /api/v1/authentication-links/inspection': publicRoute,
  'POST /api/v1/account-activations': publicRoute,
  'POST /api/v1/password-recovery-requests': publicRoute,
  'POST /api/v1/password-recoveries': publicRoute,
  'POST /api/v1/admin-web/authentication-sessions': publicRoute,
  'POST /api/v1/admin-web/password-recoveries': publicRoute,
  'POST /api/v1/authentication-sessions': publicRoute,
  'POST /api/v1/email-changes': publicRoute,
  'POST /api/v1/client-email-verifications': publicRoute,
  'POST /api/v1/client-registrations/cancellations': publicRoute,
  'POST /api/v1/client-registrations/verification-resends': publicRoute,
  'POST /api/v1/client-registrations/email-corrections': publicRoute,
  'POST /api/v1/client-registrations': publicRoute,
  'GET /api/v1/plans': publicRoute,
  'GET /api/v1/plans/{planId}': publicRoute,
  'GET /api/v1/branches': publicRoute,
  'GET /api/v1/class-types': publicRoute,
  'GET /api/v1/promotions': publicRoute,
  'GET /api/v1/promotion-images/{imageAssetId}/{kind}/{deliveryVersion}':
    publicRoute,

  // Her own Account and session.
  'PATCH /api/v1/accounts/current/password': both('allow'),
  'GET /api/v1/admin-web/authentication-sessions/current': both('allow'),
  'DELETE /api/v1/admin-web/authentication-sessions/current': both('allow'),
  'GET /api/v1/authentication-sessions/current': both('allow'),
  'DELETE /api/v1/authentication-sessions/current': both('allow'),
  'POST /api/v1/accounts/current/email-change': both('allow'),
  'GET /api/v1/accounts/current/email-change': both('allow'),
  'DELETE /api/v1/accounts/current/email-change': both('allow'),
  'POST /api/v1/accounts/current/email-change/resends': both('allow'),
  'GET /api/v1/staff-members/current': both('allow'),
  'GET /api/v1/notifications': both('allow'),
  'GET /api/v1/notifications/unread-count': both('allow'),
  'POST /api/v1/notifications/read-all': both('allow'),
  'POST /api/v1/notifications/{notificationId}/read': both('allow'),
  'PUT /api/v1/notifications/devices/current': both('allow'),
  'POST /api/v1/notifications/devices/current/deactivate': both('allow'),
  // Pending uploads belong to the Account; attaching one is authorized where
  // it is used (a receipt, a photo, a Promotion).
  'POST /api/v1/uploads': both('allow', { ownerScoped: true }),
  'PUT /api/v1/uploads/{id}/object': both('allow', {
    ownerScoped: true,
    rawBody: true,
  }),
  'POST /api/v1/uploads/{id}/finalize': both('allow', { ownerScoped: true }),
  'GET /api/v1/uploads/{id}': both('allow', { ownerScoped: true }),

  // REL-012: any signed-in Account may send feedback; triage is money-free
  // operations the Administrator alone runs (ADR-0102).
  'POST /api/v1/feedback': both('allow', {
    body: {
      type: 'suggestion',
      text: 'Un comentario de al menos diez.',
      appVersion: '1.0.1',
      appBuild: '3',
      platform: 'ios',
      osVersion: '18.2',
    },
  }),
  'GET /api/v1/administrator/feedback': administratorOnly(),
  'GET /api/v1/administrator/feedback/export': administratorOnly(),
  'GET /api/v1/administrator/founder-memberships': administratorOnly(),
  'POST /api/v1/administrator/feedback/{feedbackId}/triage': administratorOnly({
    body: { status: 'reviewed', changeNote: null },
  }),

  // Impersonation (ADR-0100): only an Administrator starts one; the
  // Coordinator may be seen as, never see as. Ending one ends the session's
  // own, so a session without one answers 404 whatever its Role.
  'POST /api/v1/impersonations': administratorOnly(),
  'DELETE /api/v1/impersonations/current': both('allow'),

  // The Client's own app.
  'GET /api/v1/bookings/history': both('deny'),
  'GET /api/v1/clients/current': both('deny'),
  'PATCH /api/v1/clients/current': both('deny'),
  'GET /api/v1/clients/current/subscription': both('deny'),
  'GET /api/v1/bookings': both('deny'),
  'POST /api/v1/purchase-intents': both('deny'),
  'GET /api/v1/purchase-intents/current': both('deny'),
  'POST /api/v1/purchase-intents/{purchaseIntentId}/receipt': both('deny'),
  // PAY-007: a missing body is invalid before the Role is checked.
  'POST /api/v1/purchase-intents/{purchaseIntentId}/submit': both('deny', {
    body: { invoiceData: null },
  }),
  'POST /api/v1/credit-purchases': both('deny'),
  'GET /api/v1/payments/current': both('deny'),
  'GET /api/v1/clients/current/invoice-data': both('deny'),
  'GET /api/v1/clients/current/credit': both('deny'),
  'GET /api/v1/clients/current/referrals': both('deny'),
  // The studio's bank details for a transfer: shown to anyone signed in.
  'GET /api/v1/transfer-instructions': both('allow'),
  'GET /api/v1/transfer-instructions/qr': both('allow'),
  'POST /api/v1/accounts/current/closure': both('deny'),
  'GET /api/v1/clients/current/promotions-consent': both('deny'),
  'PUT /api/v1/clients/current/promotions-consent': both('deny'),
  'PUT /api/v1/clients/current/photo': both('deny'),
  'DELETE /api/v1/clients/current/photo': both('deny'),
  'GET /api/v1/clients/current/photo': both('deny'),
  ...evaluationAuthorizationRows(),

  // The Trainer's own work. The Nutritionist's rows live with the Evaluation
  // ones, because this file is already at the size limit.
  'POST /api/v1/sessions/{sessionId}/attendance': both('deny', {
    body: { outcomes: [{ bookingId: uuid, outcome: 'attended' }] },
  }),
  'GET /api/v1/trainer/sessions': both('deny'),
  'GET /api/v1/trainer/sessions/{sessionId}/roster': both('deny'),

  // Bookings on a Client's behalf: the Coordinator like the Assistant, at
  // every Branch; the Administrator never books for a Client.
  'GET /api/v1/sessions': both('allow'),
  'GET /api/v1/sessions/{sessionId}': both('allow'),
  'POST /api/v1/sessions/{sessionId}/bookings': coordinatorOnly({
    realIds: true,
    body: (ids) => ({ clientId: ids.clientId }),
  }),
  'POST /api/v1/sessions/{sessionId}/waitlist-entries': coordinatorOnly({
    realIds: true,
    body: (ids) => ({ clientId: ids.clientId }),
  }),
  'DELETE /api/v1/bookings/{bookingId}': coordinatorOnly({ realIds: true }),
  'POST /api/v1/bookings/{bookingId}/reschedule': coordinatorOnly({
    realIds: { bookingId: 'rescheduleBookingId' },
    body: (ids) => ({ targetSessionId: ids.otherSessionId }),
  }),
  'DELETE /api/v1/waitlist-entries/{waitlistEntryId}': coordinatorOnly({
    realIds: true,
  }),
  'GET /api/v1/assistant/clients': both('allow', { query: '?q=lu' }),
  'GET /api/v1/assistant/clients/{clientId}': both('allow'),
  'GET /api/v1/assistant/clients/{clientId}/bookings': both('allow'),
  'GET /api/v1/assistant/clients/{clientId}/class-history': both('allow'),
  // Selling and registering new Clients stay at the front desk.
  'GET /api/v1/assistant/clients/{clientId}/plan-quotes': administratorOnly(),
  'POST /api/v1/assistant/clients/{clientId}/cash-payments': administratorOnly({
    body: {
      planId: uuid,
      branchId: uuid,
      invoiceData: null,
    },
  }),
  // PAY-007: last Invoice Data for a cash sale; Assistants and Administrators
  // only (the Coordinator does not sell).
  'GET /api/v1/assistant/clients/{clientId}/invoice-data': administratorOnly(),
  // PAY-006: a front-desk transfer receipt stays pending for review.
  // Only an Assistant photographs it. Neither Role under test reaches it.
  'POST /api/v1/assistant/clients/{clientId}/transfer-payments': both('deny', {
    body: {
      planId: uuid,
      branchId: uuid,
      imageAssetId: uuid,
    },
  }),
  'POST /api/v1/assistant/client-invitations': administratorOnly(),
  'GET /api/v1/assistant/client-invitations/{clientId}': administratorOnly(),
  'POST /api/v1/assistant/client-invitations/{clientId}/email-corrections':
    administratorOnly(),
  'POST /api/v1/assistant/client-invitations/{clientId}/resends':
    administratorOnly(),
  'POST /api/v1/assistant/client-invitations/{clientId}/verification-emails':
    administratorOnly(),
  'POST /api/v1/assistant/client-invitations/{clientId}/cancellation':
    administratorOnly(),

  // Clients: the directory, the detail without amounts, and corrections.
  'GET /api/v1/administrator/clients': both('allow'),
  'GET /api/v1/administrator/clients/{clientId}': both('allow'),
  'PATCH /api/v1/administrator/clients/{clientId}': both('allow'),
  'POST /api/v1/administrator/clients/{clientId}/closure': administratorOnly(),
  'GET /api/v1/administrator/contact-alerts': both('allow'),
  'POST /api/v1/administrator/contact-alerts/{clientId}/contacted': both(
    'allow',
    { realIds: { clientId: 'clientId' } },
  ),
  // REL-011: tester access is the Administrator's. The date only has to
  // parse; the use case refuses a Client who already has a Plan.
  'POST /api/v1/administrator/clients/{clientId}/courtesy-access':
    administratorOnly({
      body: { endsOn: '2026-11-23' },
    }),
  // BKM-008: extra classes. Administrator only; Coordinator sees no money
  // and does not grant classes. Body must pass the DTO before the Role check.
  'POST /api/v1/administrator/clients/{clientId}/allowance-adjustments':
    administratorOnly({
      body: { classes: 1, reason: 'courtesy' },
    }),
  // BKM-011: how she found the studio. A body is required before the Role
  // is checked; the use case decides who may correct it.
  'GET /api/v1/administrator/clients/{clientId}/acquisition':
    administratorOnly(),
  'PUT /api/v1/administrator/clients/{clientId}/acquisition': administratorOnly(
    {
      body: { channel: 'instagram', referralCode: null },
    },
  ),

  // Staff: details for the schedule; access decisions stay with the
  // Administrator.
  'GET /api/v1/administrator/staff-members': both('allow'),
  'GET /api/v1/administrator/staff-members/{staffMemberId}': both('allow'),
  // BKM-011: a Trainer's personal code is the Administrator's.
  'GET /api/v1/administrator/staff-members/{staffMemberId}/referral-code':
    administratorOnly(),
  'PUT /api/v1/administrator/staff-members/{staffMemberId}/referral-code':
    administratorOnly({ body: { referralCode: null } }),
  'POST /api/v1/administrator/staff-members': administratorOnly(),
  'POST /api/v1/administrator/staff-members/{staffMemberId}/activation-link':
    administratorOnly(),
  'POST /api/v1/administrator/staff-members/{staffMemberId}/email-corrections':
    administratorOnly(),
  'POST /api/v1/administrator/staff-members/{staffMemberId}/invitation-cancellation':
    administratorOnly(),
  'PUT /api/v1/administrator/staff-members/{staffMemberId}/role':
    administratorOnly(),
  'POST /api/v1/administrator/staff-members/{staffMemberId}/deactivation':
    administratorOnly(),

  // The schedule and its Sessions.
  'GET /api/v1/administrator/session-schedules': both('allow'),
  'POST /api/v1/administrator/session-schedules': both('allow'),
  'POST /api/v1/administrator/session-schedules/{scheduleId}/replacement':
    both('allow'),
  'POST /api/v1/administrator/session-schedules/{scheduleId}/end':
    both('allow'),
  'POST /api/v1/administrator/session-schedules/batch': both('allow'),
  'POST /api/v1/administrator/sessions': both('allow'),
  'GET /api/v1/administrator/sessions': both('allow'),
  'PATCH /api/v1/administrator/sessions/{sessionId}': both('allow'),
  'POST /api/v1/administrator/sessions/{sessionId}/cancel': both('allow'),

  ...catalogAuthorizationRows(),
  'GET /api/v1/administrator/plans': administratorOnly(),
  // BKM-004: the Administrator edits the studio rules. The public rules
  // need no credential.
  'GET /api/v1/administrator/studio-settings': administratorOnly(),
  'PUT /api/v1/administrator/studio-settings': administratorOnly({
    body: {
      expectedVersion: 1,
      minimumBookings: 2,
      taxRatePercent: 16,
      renewalTargetMonths1To6Percent: 40,
      renewalTargetMonths7To12Percent: 55,
      renewalTargetFromMonth13Percent: 70,
      openingDate: null,
    },
  }),
  'GET /api/v1/studio-rules': publicRoute,
  // BKM-005: a Plan is 30, 60, or 90 days. A body is required before the
  // Role is checked.
  'POST /api/v1/administrator/plans': administratorOnly({
    body: {
      name: 'Mensual',
      durationDays: 30,
      weeklyClassCap: null,
      classAllowance: 8,
      priceCentavos: 35000,
      displayOrder: 1,
    },
  }),
  'PUT /api/v1/administrator/plans/{planId}': administratorOnly({
    body: {
      name: 'Mensual',
      durationDays: 30,
      weeklyClassCap: null,
      classAllowance: 8,
      priceCentavos: 35000,
      displayOrder: 1,
    },
  }),
  'PUT /api/v1/administrator/plans/{planId}/visibility': administratorOnly(),

  // Oversight and money: Payments, Credit, Referrals, reports, Evaluations.
  'GET /api/v1/administrator/evaluations': administratorOnly(),
  'DELETE /api/v1/administrator/evaluations/{evaluationId}':
    administratorOnly(),
  'GET /api/v1/administrator/referrals': administratorOnly(),
  // PAY-005 retired Credit, so GET /administrator/credits is gone.
  'GET /api/v1/administrator/reports/income': administratorOnly(),
  // BKO-005: the month result and the opening budget are money. The month
  // has to parse, or the Role check never runs.
  'GET /api/v1/administrator/reports/finance': administratorOnly({
    query: '?month=2026-10',
  }),
  'POST /api/v1/administrator/reports/finance/opening-budget':
    administratorOnly(),
  'GET /api/v1/administrator/payments/pending': administratorOnly(),
  'GET /api/v1/administrator/payments/{paymentId}': administratorOnly(),
  'GET /api/v1/administrator/payments/{paymentId}/receipt': administratorOnly(),
  'POST /api/v1/administrator/payments/{paymentId}/confirm':
    administratorOnly(),
  'POST /api/v1/administrator/payments/{paymentId}/reject': administratorOnly(),
  // PAY-006: voiding a sale is money. A reason is required before the Role check.
  'POST /api/v1/administrator/payments/{paymentId}/void': administratorOnly({
    body: { reason: 'Registrado por error' },
  }),
  'GET /api/v1/administrator/payments': administratorOnly(),
  // PAY-007: «Factura emitida» is the Administrator's money work.
  'POST /api/v1/administrator/payments/{paymentId}/invoice-issued':
    administratorOnly(),
  'DELETE /api/v1/administrator/payments/{paymentId}/invoice-issued':
    administratorOnly(),

  // Promotions and their contacts.
  'GET /api/v1/administrator/promotions': administratorOnly(),
  'POST /api/v1/administrator/promotions': administratorOnly(),
  'PUT /api/v1/administrator/promotions/order': administratorOnly({
    body: { promotionIds: [uuid] },
  }),
  'PUT /api/v1/administrator/promotions/{promotionId}': administratorOnly(),
  'DELETE /api/v1/administrator/promotions/{promotionId}': administratorOnly(),
  'POST /api/v1/administrator/promotions/{promotionId}/publish':
    administratorOnly(),
  'POST /api/v1/administrator/promotions/{promotionId}/unpublish':
    administratorOnly(),
  'GET /api/v1/administrator/promotions/{promotionId}/image':
    administratorOnly(),
  'GET /api/v1/administrator/promotion-contacts': administratorOnly(),
  'GET /api/v1/administrator/promotion-contacts/export': administratorOnly(),
  'POST /api/v1/administrator/promotion-contacts/{contactId}/withdrawal':
    administratorOnly(),

  // BKO-003: closing the drawer is the Assistant's and the Administrator's.
  // The Coordinator sees no amount (ADR-0102), so every cash-close route
  // refuses her. The history is the Administrator's alone.
  'GET /api/v1/cash-closes/today': administratorOnly({
    query: `?branchId=${uuid}`,
  }),
  'POST /api/v1/cash-closes': administratorOnly({
    body: { branchId: uuid, countedCentavos: 0, note: null },
  }),
  'GET /api/v1/administrator/cash-closes': administratorOnly({
    query: `?branchId=${uuid}&month=2026-10`,
  }),

  // Back Office: supplies, payroll, expenses.
  'GET /api/v1/administrator/supplies': administratorOnly(),
  'POST /api/v1/administrator/supplies': administratorOnly(),
  'PUT /api/v1/administrator/supplies/{supplyId}': administratorOnly(),
  'POST /api/v1/administrator/supplies/{supplyId}/archive': administratorOnly(),
  ...supplyMovementAuthorizationRows(),
  'GET /api/v1/administrator/withdrawals': administratorOnly(),
  ...payStatementAuthorizationRows(),
  ...studioFactsAuthorizationRows(),
  'GET /api/v1/administrator/salary-payments': administratorOnly(),
  'POST /api/v1/administrator/salary-payments': administratorOnly(),
  'PUT /api/v1/administrator/salary-payments/{salaryPaymentId}':
    administratorOnly(),
  'GET /api/v1/administrator/expense-categories': administratorOnly(),
  'POST /api/v1/administrator/expense-categories': administratorOnly(),
  'DELETE /api/v1/administrator/expense-categories/{expenseCategoryId}':
    administratorOnly(),
  'GET /api/v1/administrator/expenses': administratorOnly(),
  'POST /api/v1/administrator/expenses': administratorOnly(),
  'PUT /api/v1/administrator/expenses/{expenseId}': administratorOnly(),
  'GET /api/v1/administrator/reports/expenses': administratorOnly(),

  // BKO-004 / ADR-0106: Equipment is operational, not money. The Administrator
  // and the Coordinator manage it and resolve faults; a Trainer reports a
  // fault only from a Session she leads (trainer routes refuse both Roles
  // here).
  'GET /api/v1/administrator/equipment': both('allow', {
    query: `?branchId=${uuid}`,
  }),
  'POST /api/v1/administrator/equipment': both('allow', {
    body: { branchId: uuid, kind: 'reformer', number: 1 },
  }),
  'POST /api/v1/administrator/equipment/{equipmentId}/archive': both('allow'),
  'POST /api/v1/administrator/equipment/{equipmentId}/issues': both('allow', {
    body: { description: 'mmmmmmmm', outOfService: true },
  }),
  'GET /api/v1/administrator/equipment-issues': both('allow', {
    query: `?branchId=${uuid}`,
  }),
  'POST /api/v1/administrator/equipment-issues/{issueId}/resolve':
    both('allow'),
  'GET /api/v1/administrator/equipment-flags': both('allow', {
    query: `?branchId=${uuid}&from=2030-01-07T15:00:00.000Z&until=2030-01-14T15:00:00.000Z`,
  }),
  'GET /api/v1/trainer/sessions/{sessionId}/equipment': both('deny'),
  'POST /api/v1/trainer/sessions/{sessionId}/equipment-issues': both('deny', {
    body: {
      equipmentId: uuid,
      description: 'mmmmmmmm',
      outOfService: true,
    },
  }),
  ...campaignAuthorizationRows(),
};

/** A concrete address for a templated path. */
export const concretePath = (
  path: string,
  ids?: RealIds,
  renames: Partial<Record<string, keyof RealIds>> = {},
): string =>
  path
    .replace('{kind}', 'display')
    .replace('{deliveryVersion}', '1')
    .replace(
      /\{([A-Za-z]+)\}/g,
      (_match, name: string) =>
        ids?.[renames[name] ?? (name as keyof RealIds)] ?? uuid,
    );
