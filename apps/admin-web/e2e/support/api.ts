import { createHash, randomUUID } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { apiOrigin, fixtures } from "./environment";
import { receiptPng } from "./receipt-png";

type CallOptions = {
  token?: string;
  body?: unknown;
  raw?: Uint8Array<ArrayBuffer>;
  headers?: Record<string, string>;
};

class ApiCallError extends Error {
  readonly status: number;
  readonly code: string | undefined;

  constructor(status: number, code: string | undefined, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/**
 * What a journey needs the backend to hold before the browser arrives, sent
 * as the Client app would (WEB-034): a transfer in review, a closed Account.
 * The admin web never calls these; it only sees their outcome.
 */
async function call(
  method: string,
  path: string,
  { token, body, raw, headers = {} }: CallOptions = {},
): Promise<unknown> {
  const response = await fetch(`${apiOrigin}/api/v1${path}`, {
    method,
    headers: {
      ...(raw === undefined ? { "Content-Type": "application/json" } : {}),
      ...(token === undefined ? {} : { Authorization: `Bearer ${token}` }),
      ...headers,
    },
    body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
  const text = await response.text();
  const parsed: unknown = text === "" ? null : JSON.parse(text);
  if (!response.ok) {
    const code =
      typeof parsed === "object" && parsed !== null && "code" in parsed
        ? String(parsed.code)
        : undefined;
    throw new ApiCallError(
      response.status,
      code,
      `${method} ${path}: ${response.status} ${text}`,
    );
  }
  return parsed;
}

const idempotent = () => ({ "Idempotency-Key": randomUUID() });

export async function loginClient(email: string): Promise<string> {
  const session = (await call("POST", "/authentication-sessions", {
    body: { email, password: fixtures.password },
  })) as { credential: string };
  return session.credential;
}

async function uploadReceipt(token: string): Promise<string> {
  const bytes = receiptPng();
  const declared = (await call("POST", "/uploads", {
    token,
    body: {
      purpose: "transfer_receipt",
      mediaType: "image/png",
      byteSize: bytes.length,
      checksum: createHash("sha256").update(bytes).digest("base64"),
    },
  })) as { id: string };
  await call("PUT", `/uploads/${declared.id}/object`, {
    token,
    raw: new Uint8Array(bytes),
    headers: { "Content-Type": "image/png" },
  });
  await call("POST", `/uploads/${declared.id}/finalize`, {
    token,
    headers: idempotent(),
  });
  // The worker the global setup started turns it into variants.
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const status = (await call("GET", `/uploads/${declared.id}`, {
      token,
    })) as { state: string };
    if (status.state === "ready") return declared.id;
    if (status.state === "failed") {
      throw new Error("The worker rejected the receipt");
    }
    await sleep(500);
  }
  throw new Error("The receipt was still processing after 60 s");
}

const alreadyInReview = (error: unknown) =>
  error instanceof ApiCallError &&
  (error.code === "purchase_intent_open_exists" ||
    error.code === "payment_pending_exists");

/**
 * The Client buys «Paquete de 8 clases» by transfer and sends a receipt,
 * so Pagos holds one more transfer awaiting review. A Client whose transfer
 * is already in review is left as she is, so journeys can share a seed in
 * whichever order they run.
 */
export async function sendTransfer(email: string): Promise<void> {
  const token = await loginClient(email);
  const plans = (await call("GET", "/plans", { token })) as {
    id: string;
    name: string;
  }[];
  const plan = plans.find(
    (candidate) => candidate.name === "Paquete de 8 clases",
  );
  if (plan === undefined) throw new Error("The fixtures lost the 8-class Plan");
  let intent: { id: string };
  try {
    intent = (await call("POST", "/purchase-intents", {
      token,
      body: { planId: plan.id },
      headers: idempotent(),
    })) as { id: string };
  } catch (error) {
    if (alreadyInReview(error)) return;
    throw error;
  }
  const imageAssetId = await uploadReceipt(token);
  await call("POST", `/purchase-intents/${intent.id}/receipt`, {
    token,
    body: { imageAssetId },
    headers: idempotent(),
  });
  await call("POST", `/purchase-intents/${intent.id}/submit`, {
    token,
    headers: idempotent(),
  });
}

/** The Client closes her own Account from Perfil (screen 24, ADR-0097). */
export async function closeOwnAccount(
  email: string,
  options: { keepPromotions: boolean },
): Promise<void> {
  const token = await loginClient(email);
  await call("POST", "/accounts/current/closure", {
    token,
    body: { password: fixtures.password, ...options },
  });
}
