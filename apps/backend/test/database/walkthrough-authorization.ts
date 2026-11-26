import type { MatrixRow } from './authorization-matrix';

const allow: MatrixRow = { administrator: 'allow', coordinator: 'allow' };
const publicRoute: MatrixRow = { ...allow, public: true };

// The owner's app walkthrough (26 Nov 2026), split out so the matrix file,
// already past the size limit, does not grow.
export const walkthroughAuthorizationRows = (): Record<string, MatrixRow> => ({
  // n.º 4: «Revisa tu correo» asks with its continuation, no credential.
  'POST /api/v1/client-registrations/status-checks': publicRoute,
  // n.º 18: «Crea tu cuenta» names a code's holder before the Account exists.
  'GET /api/v1/referral-codes/lookup': publicRoute,
  // n.º 2: the Clientas file says a pending Client's email bounced.
  'GET /api/v1/assistant/client-invitations/{clientId}/email-delivery': allow,
  // n.º 10: every Account removes and restores its own notifications.
  'DELETE /api/v1/notifications/{notificationId}': allow,
  'POST /api/v1/notifications/{notificationId}/restore': allow,
  // n.º 11: the Staff app's «Comentarios» reads the comments and one of
  // them, as the admin web does (Administrator and Coordinator).
  'GET /api/v1/administrator/feedback': allow,
  'GET /api/v1/administrator/feedback/export': allow,
  'GET /api/v1/administrator/feedback/{feedbackId}': allow,
});
