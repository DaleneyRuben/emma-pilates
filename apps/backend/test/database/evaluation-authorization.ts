import type { MatrixRow } from './authorization-matrix';

const both = (access: 'allow' | 'deny'): MatrixRow => ({
  administrator: access,
  coordinator: access,
});

const administratorOnly = (): MatrixRow => ({
  administrator: 'allow',
  coordinator: 'deny',
});

// NUT-003: a Client books her Evaluation. Staff never starts that transfer.
// The Nutritionist records a no-show on her own agenda, and the Administrator
// may too. The Coordinator does not run that agenda. Kept beside the matrix
// because that file is already at the size limit.
export const evaluationAuthorizationRows = (): Record<string, MatrixRow> => ({
  'GET /api/v1/evaluation-slots': both('deny'),
  'GET /api/v1/evaluation-slots/{slotId}': both('deny'),
  'POST /api/v1/evaluation-slots/{slotId}/evaluations': both('deny'),
  // A real slot reaches the Role check. A missing id was 404 before that
  // check ran, so the probe never saw who may start the payment.
  'POST /api/v1/evaluation-slots/{slotId}/evaluation-payments': {
    ...both('deny'),
    bearer: true,
    realIds: { slotId: 'slotId' },
  },
  'GET /api/v1/evaluations': both('deny'),
  // The Client attaches her own receipt. Staff is not that Client, so both
  // Roles are denied before the image is read.
  'POST /api/v1/evaluations/{evaluationId}/receipt': both('deny'),
  'DELETE /api/v1/evaluations/{evaluationId}': both('deny'),
  // The Client moves her own confirmed Paid Evaluation. Staff is not that
  // Client, so both Roles are denied.
  'POST /api/v1/evaluations/{evaluationId}/reschedule': both('deny'),
  'GET /api/v1/nutritionist/evaluations': both('deny'),
  'DELETE /api/v1/nutritionist/evaluations/{evaluationId}': administratorOnly(),
  'POST /api/v1/nutritionist/evaluations/{evaluationId}/no-show':
    administratorOnly(),
  'GET /api/v1/nutritionist/availability-blocks': both('deny'),
  'POST /api/v1/nutritionist/availability-blocks': both('deny'),
  'POST /api/v1/nutritionist/availability-blocks/{blockId}/replacement':
    both('deny'),
  'POST /api/v1/nutritionist/availability-blocks/{blockId}/end': both('deny'),
});
