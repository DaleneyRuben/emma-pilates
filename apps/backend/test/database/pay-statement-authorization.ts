import type { MatrixRow } from './authorization-matrix';

const administratorOnly = (query?: string): MatrixRow => ({
  administrator: 'allow',
  coordinator: 'deny',
  ...(query === undefined ? {} : { query }),
});

const bothDenied = (): MatrixRow => ({
  administrator: 'deny',
  coordinator: 'deny',
});

// BKO-006: trainer pay is money. The month has to parse, or the Role check
// never runs. Approve takes only the statement id. A Trainer reads her own,
// so the Administrator and the Coordinator are refused. Kept beside the
// matrix because that file is already at the size limit.
export const payStatementAuthorizationRows = (): Record<string, MatrixRow> => ({
  'GET /api/v1/administrator/pay-statements':
    administratorOnly('?month=2026-10'),
  'POST /api/v1/administrator/pay-statements/draft':
    administratorOnly('?month=2026-10'),
  'POST /api/v1/administrator/pay-statements/{statementId}/approve':
    administratorOnly(),
  'GET /api/v1/trainer/pay-statements': bothDenied(),
  // BKO-007: the Coordinator never reads her own statement. The route exists
  // so the denial is a 403 rather than a missing path.
  'GET /api/v1/coordinator/pay-statements': bothDenied(),
});
