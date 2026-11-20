import type { MatrixRow } from './authorization-matrix';

const administratorOnly = (query?: string): MatrixRow => ({
  administrator: 'allow',
  coordinator: 'deny',
  ...(query === undefined ? {} : { query }),
});

// ADR-0111: every paid Staff Member, the Coordinator included, reads her own
// pay; the Administrator reads everyone's through Sueldos instead. A receipt
// that is not hers answers 404 after the Role passed.
const ownPay = (): MatrixRow => ({
  administrator: 'deny',
  coordinator: 'allow',
});

// BKO-006: staff pay is money. The month has to parse, or the Role check
// never runs. Approve takes only the statement id. Kept beside the matrix
// because that file is already at the size limit.
export const payStatementAuthorizationRows = (): Record<string, MatrixRow> => ({
  'GET /api/v1/administrator/pay-statements':
    administratorOnly('?month=2026-10'),
  'POST /api/v1/administrator/pay-statements/draft':
    administratorOnly('?month=2026-10'),
  'POST /api/v1/administrator/pay-statements/{statementId}/approve':
    administratorOnly(),
  'GET /api/v1/staff-members/current/pay-statements': ownPay(),
  'GET /api/v1/staff-members/current/salary-payments': ownPay(),
  'GET /api/v1/staff-members/current/salary-payments/{salaryPaymentId}/receipt':
    ownPay(),
  // The released Staff app's routes answer under the same rule.
  'GET /api/v1/trainer/pay-statements': ownPay(),
  'GET /api/v1/coordinator/pay-statements': ownPay(),
  'GET /api/v1/trainer/salary-payments': ownPay(),
  // BKO-008: the receipt is the Administrator's, or the paid Staff Member's own.
  'GET /api/v1/administrator/salary-payments/{salaryPaymentId}/receipt':
    administratorOnly(),
  'GET /api/v1/trainer/salary-payments/{salaryPaymentId}/receipt': ownPay(),
});
