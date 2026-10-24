// Seeds what the Staff journeys need that Maestro's own scripts cannot send
// (a binary receipt upload) or must not wait for (a finished class). Run it
// once against a fresh fixtures database, with the API and the worker up,
// before the suite (Test 19):
//
//   API_URL=http://127.0.0.1:3100 node .maestro/seed.mjs
//
// - Mariana (no Plan yet) and Sofía (expired Plan) each buy
//   the 8-class Plan by transfer and send a receipt, for
//   administrator-review-payments.yaml to confirm one and reject the other.
//   A Client whose Plan is still active cannot buy, so this needs the
//   fixtures as they ship, not a database the Client suite has used.
// - A five-minute Reformer Session for Emma at Centro starting in about two
//   minutes, booked by Lucía, for trainer-attendance.yaml; it has ended by
//   the time the suite reaches that flow.
import { createHash, randomUUID } from "node:crypto";
import { deflateSync } from "node:zlib";

const api = `${(process.env.API_URL ?? "http://127.0.0.1:3100").replace(/\/$/, "")}/api/v1`;
const password = process.env.PASSWORD ?? "emma-local-2026";
const minute = 60_000;

async function call(method, path, { token, body, headers = {}, raw } = {}) {
  const response = await fetch(`${api}${path}`, {
    method,
    headers: {
      ...(raw === undefined ? { "Content-Type": "application/json" } : {}),
      ...(token === undefined ? {} : { Authorization: `Bearer ${token}` }),
      ...headers,
    },
    body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${text}`);
  return text === "" ? null : JSON.parse(text);
}

const login = async (email) =>
  (await call("POST", "/authentication-sessions", { body: { email, password } })).credential;

const idempotent = () => ({ "Idempotency-Key": randomUUID() });

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes) {
  let c = 0xffffffff;
  for (const byte of bytes) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typed = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed));
  return Buffer.concat([length, typed, crc]);
}

// A plain 240 × 320 receipt-coloured PNG: the worker only needs a real image.
function receiptPng(width = 240, height = 320) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 2, 0, 0, 0], 8);
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(width * 3, 0xf2)]);
  const pixels = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(pixels)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

async function uploadReceipt(token) {
  const bytes = receiptPng();
  const declared = await call("POST", "/uploads", {
    token,
    body: {
      purpose: "transfer_receipt",
      mediaType: "image/png",
      byteSize: bytes.length,
      checksum: createHash("sha256").update(bytes).digest("base64"),
    },
  });
  await call("PUT", `/uploads/${declared.id}/object`, {
    token,
    raw: bytes,
    headers: { "Content-Type": "image/png" },
  });
  await call("POST", `/uploads/${declared.id}/finalize`, { token, headers: idempotent() });
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const status = await call("GET", `/uploads/${declared.id}`, { token });
    if (status.state === "ready") return declared.id;
    if (status.state === "failed") throw new Error("receipt rejected by the worker");
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error("receipt still processing after 60 s: is the worker running?");
}

async function sendTransfer(email) {
  const token = await login(email);
  const plans = await call("GET", "/plans", { token });
  const plan = plans.find((candidate) => candidate.name === "Paquete de 8 clases");
  const intent = await call("POST", "/purchase-intents", {
    token,
    body: { planId: plan.id },
    headers: idempotent(),
  });
  const imageAssetId = await uploadReceipt(token);
  await call("POST", `/purchase-intents/${intent.id}/receipt`, {
    token,
    body: { imageAssetId },
    headers: idempotent(),
  });
  await call("POST", `/purchase-intents/${intent.id}/submit`, { token, headers: idempotent() });
  console.log(`transfer in review for ${email}`);
}

async function seedFinishedSession() {
  const admin = await login("paola.mendoza@example.com");
  const branches = await call("GET", "/branches", { token: admin });
  const classTypes = await call("GET", "/class-types", { token: admin });
  const { items: staff } = await call("GET", "/administrator/staff-members", { token: admin });
  const centro = branches.find((branch) => branch.name === "Centro");
  const reformer = classTypes.find((classType) => classType.name === "Reformer Pilates");
  const emma = staff.find((member) => member.name === "Emma Vargas");
  const from = Math.ceil((Date.now() + 2 * minute) / minute) * minute;
  // Another class at Centro or Emma's own may hold the slot: step 10 minutes.
  for (let step = 0; step < 12; step += 1) {
    const startsAt = new Date(from + step * 10 * minute).toISOString();
    try {
      const session = await call("POST", "/administrator/sessions", {
        token: admin,
        body: {
          branchId: centro.id,
          classTypeId: reformer.id,
          trainerStaffMemberId: emma.id,
          startsAt,
          durationMinutes: 5,
        },
      });
      await call("POST", `/sessions/${session.id}/bookings`, {
        token: await login("lucia@example.com"),
        body: {},
        headers: idempotent(),
      });
      console.log(`finished Session for Emma at ${startsAt}, ends five minutes later`);
      return;
    } catch (error) {
      if (step === 11) throw error;
    }
  }
}

await sendTransfer("mariana@example.com");
await sendTransfer("sofia@example.com");
await seedFinishedSession();
