import { http } from "msw";
import { apiUrl, jsonResponse } from "./msw";

const emptyPage = { items: [], page: 1, pageSize: 20, totalItems: 0 };

// WEB-040: the Client file's tabs read her bookings, class history, and
// Evaluations, and the Administrator's her sales; by default she has none.
// The list reads only answer a request that names a Client, so the agenda
// and Dinero › Pagos still need their own handlers.
export const clientFileHandlers = ({ payments }: { payments: boolean }) => [
  http.get(apiUrl("/api/v1/assistant/clients/:clientId/bookings"), () =>
    jsonResponse([]),
  ),
  http.get(apiUrl("/api/v1/assistant/clients/:clientId/class-history"), () =>
    jsonResponse([]),
  ),
  http.get(apiUrl("/api/v1/administrator/evaluations"), ({ request }) =>
    new URL(request.url).searchParams.has("clientId")
      ? jsonResponse(emptyPage)
      : undefined,
  ),
  ...(payments
    ? [
        http.get(apiUrl("/api/v1/administrator/payments"), ({ request }) =>
          new URL(request.url).searchParams.has("clientId")
            ? jsonResponse({ ...emptyPage, pendingCount: 0 })
            : undefined,
        ),
      ]
    : []),
];
