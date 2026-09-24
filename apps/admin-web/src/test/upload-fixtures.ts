import { http, HttpResponse } from "msw";
import { apiUrl, jsonResponse } from "./msw";

export const uploadsPath = "/api/v1/uploads";
export const uploadedAssetId = "1b000000-0000-5000-8000-000000000042";

export type UploadSeen = {
  declared?: unknown;
  put?: { type: string | null; byteLength: number };
  finalizeKey?: string | null;
  polls: number;
};

// Test 32's three calls answered by MSW: the worker's verdict is the last
// state in `states`, reached one poll at a time.
export const uploadHandlers = (
  seen: UploadSeen,
  states: ("processing" | "ready" | "failed")[] = ["ready"],
) => [
  http.post(apiUrl(uploadsPath), async ({ request }) => {
    seen.declared = await request.json();
    return jsonResponse(
      {
        id: uploadedAssetId,
        uploadUrl: `${uploadsPath}/${uploadedAssetId}/object`,
        expiresAt: "2026-09-24T12:15:00.000Z",
      },
      201,
    );
  }),
  http.put(
    apiUrl(`${uploadsPath}/${uploadedAssetId}/object`),
    async ({ request }) => {
      seen.put = {
        type: request.headers.get("content-type"),
        byteLength: (await request.arrayBuffer()).byteLength,
      };
      return new HttpResponse(null, { status: 204 });
    },
  ),
  http.post(
    apiUrl(`${uploadsPath}/${uploadedAssetId}/finalize`),
    ({ request }) => {
      seen.finalizeKey = request.headers.get("idempotency-key");
      return jsonResponse({ id: uploadedAssetId, state: "processing" }, 202);
    },
  ),
  http.get(apiUrl(`${uploadsPath}/${uploadedAssetId}`), () => {
    const state = states[Math.min(seen.polls, states.length - 1)];
    seen.polls += 1;
    return jsonResponse({ id: uploadedAssetId, state, mediaType: null });
  }),
];
