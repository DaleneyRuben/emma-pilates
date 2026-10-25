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
  // A slot id that does not exist is denied before the Role is read.
  'POST /api/v1/evaluation-slots/{slotId}/evaluation-payments': {
    ...both('deny'),
    missingResource: true,
    bearer: true,
  },
  'GET /api/v1/evaluations': both('deny'),
  'DELETE /api/v1/evaluations/{evaluationId}': both('deny'),
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
