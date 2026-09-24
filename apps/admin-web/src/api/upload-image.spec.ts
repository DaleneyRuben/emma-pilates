import { http, HttpResponse } from "msw";
import {
  apiUrl,
  jsonResponse,
  problemResponse,
  server,
  useMockServer,
} from "../test/msw";
import { adminFetch } from "./fetcher";
import { ApiError } from "./problem";
import {
  checkImage,
  uploadFailureMessage,
  uploadImage,
  UploadFailure,
} from "./upload-image";

const uploadsPath = "/api/v1/uploads";
const uploadId = "1b000000-0000-5000-8000-000000000042";
const bytes = new TextEncoder().encode("hello");
const file = new File([bytes], "portada.png", { type: "image/png" });
const noWait = () => Promise.resolve();

type Seen = {
  declared?: unknown;
  put?: { type: string | null; body: number[] };
  finalizeKey?: string | null;
  polls: number;
};

const uploadHandlers = (
  seen: Seen,
  states: ("processing" | "ready" | "failed")[],
) => [
  http.post(apiUrl(uploadsPath), async ({ request }) => {
    seen.declared = await request.json();
    return jsonResponse(
      {
        id: uploadId,
        uploadUrl: `${uploadsPath}/${uploadId}/object`,
        expiresAt: "2026-09-24T12:15:00.000Z",
      },
      201,
    );
  }),
  http.put(apiUrl(`${uploadsPath}/${uploadId}/object`), async ({ request }) => {
    seen.put = {
      type: request.headers.get("content-type"),
      body: Array.from(new Uint8Array(await request.arrayBuffer())),
    };
    return new HttpResponse(null, { status: 204 });
  }),
  http.post(apiUrl(`${uploadsPath}/${uploadId}/finalize`), ({ request }) => {
    seen.finalizeKey = request.headers.get("idempotency-key");
    return jsonResponse({ id: uploadId, state: "processing" }, 202);
  }),
  http.get(apiUrl(`${uploadsPath}/${uploadId}`), () => {
    const state = states[Math.min(seen.polls, states.length - 1)];
    seen.polls += 1;
    return jsonResponse({ id: uploadId, state, mediaType: null });
  }),
];

describe("uploadImage (Test 32's three calls from the browser)", () => {
  useMockServer();

  it("declares the bytes with their base64 SHA-256, puts them, finalizes with an Idempotency-Key, and waits until the worker says ready", async () => {
    const seen: Seen = { polls: 0 };
    server.use(...uploadHandlers(seen, ["processing", "ready"]));

    const imageAssetId = await uploadImage(file, "promotion", adminFetch, {
      sleep: noWait,
    });

    expect(imageAssetId).toBe(uploadId);
    expect(seen.declared).toEqual({
      purpose: "promotion",
      mediaType: "image/png",
      byteSize: 5,
      checksum: "LPJNul+wow4m6DsqxbninhsWHlwfp0JecwQzYpOLmCQ=",
    });
    expect(seen.put).toEqual({ type: "image/png", body: Array.from(bytes) });
    expect(seen.finalizeKey).toMatch(/^[0-9a-f-]{36}$/);
    expect(seen.polls).toBe(2);
  });

  it("rejects with upload_rejected when the worker fails the image", async () => {
    const seen: Seen = { polls: 0 };
    server.use(...uploadHandlers(seen, ["failed"]));

    await expect(
      uploadImage(file, "promotion", adminFetch, { sleep: noWait }),
    ).rejects.toEqual(new UploadFailure("upload_rejected"));
  });

  it("gives up after forty polls that never settle", async () => {
    const seen: Seen = { polls: 0 };
    server.use(...uploadHandlers(seen, ["processing"]));

    await expect(
      uploadImage(file, "promotion", adminFetch, { sleep: noWait }),
    ).rejects.toEqual(new UploadFailure("upload_verification_timeout"));
    expect(seen.polls).toBe(40);
  });

  it("surfaces the backend's refusal of the declaration by its code", async () => {
    server.use(
      http.post(apiUrl(uploadsPath), () =>
        problemResponse(400, "image_too_large"),
      ),
    );

    await expect(
      uploadImage(file, "promotion", adminFetch, { sleep: noWait }),
    ).rejects.toMatchObject({ code: "image_too_large" });
  });
});

describe("checkImage (ADR-0072 limits before any call)", () => {
  it("accepts a horizontal JPG, PNG, or WEBP Promotion image of at least 1200 × 675", () => {
    expect(
      checkImage("promotion", {
        mediaType: "image/webp",
        byteSize: 3_000_000,
        width: 1200,
        height: 675,
      }),
    ).toBeNull();
  });

  it("refuses another format, more than 20 MB, or a smaller image", () => {
    const fine = { byteSize: 1_000, width: 1600, height: 900 };
    expect(checkImage("promotion", { ...fine, mediaType: "image/gif" })).toBe(
      "image_media_type_invalid",
    );
    expect(
      checkImage("promotion", {
        ...fine,
        mediaType: "image/jpeg",
        byteSize: 20 * 1024 * 1024 + 1,
      }),
    ).toBe("image_too_large");
    expect(
      checkImage("promotion", {
        ...fine,
        mediaType: "image/jpeg",
        width: 1199,
        height: 900,
      }),
    ).toBe("image_dimensions_too_small");
  });
});

describe("uploadFailureMessage", () => {
  it.each([
    ["image_media_type_invalid", "Elige un archivo JPG, PNG o WEBP."],
    ["image_too_large", "La imagen pesa más de 20 MB."],
    [
      "image_dimensions_too_small",
      "La imagen debe medir al menos 1200 × 675 píxeles.",
    ],
    ["image_animated_not_allowed", "La imagen no puede ser animada."],
    [
      "upload_rejected",
      "No pudimos procesar la imagen. Revisa que sea un JPG, PNG o WEBP de al menos 1200 × 675 píxeles y que no esté animada.",
    ],
    [
      "upload_verification_timeout",
      "La imagen está tardando en procesarse. Espera un momento e inténtalo de nuevo.",
    ],
  ])("says what %s means in Spanish", (code, message) => {
    expect(uploadFailureMessage(new UploadFailure(code as never))).toBe(
      message,
    );
  });

  it("maps the backend's declaration problems by code and anything else generically", () => {
    expect(
      uploadFailureMessage(
        new ApiError({ status: 400, code: "image_media_type_invalid" }),
      ),
    ).toBe("Elige un archivo JPG, PNG o WEBP.");
    expect(uploadFailureMessage(new Error("boom"))).toBe(
      "No pudimos subir la imagen. Inténtalo de nuevo.",
    );
  });
});
