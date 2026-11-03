// Seeds a fresh fixtures database, through the API, with what the store
// screenshots show (docs/store/play-listings.md#graphics): Lucía's next two
// classes, two friends registered with her code, and a class of Daniela's
// that starts a few minutes from now with two Clients booked, so its roster
// can be photographed while attendance is open.
//
//   API_URL=http://127.0.0.1:3130/api/v1 node scripts/store-graphics/seed.mjs
//
// Needs the API and the worker on that database: the friends confirm their
// email with the token the worker writes to the local email capture.
import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const api = process.env.API_URL ?? "http://127.0.0.1:3130/api/v1";
const capture = path.resolve(import.meta.dirname, "../../apps/backend/.data/email-capture");
const password = "emma-local-2026";
const minute = 60_000;

async function request(method, route, token, body) {
  const response = await fetch(`${api}${route}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(method === "POST" && route.endsWith("/bookings") ? { "Idempotency-Key": randomUUID() } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, data: text ? JSON.parse(text) : null };
}

async function must(method, route, token, body) {
  const result = await request(method, route, token, body);
  if (result.status >= 300) throw new Error(`${method} ${route}: ${result.status} ${JSON.stringify(result.data)}`);
  return result.data;
}

const login = async (email) =>
  (await must("POST", "/authentication-sessions", null, { email, password })).credential;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// The newest captured message to `email` that carries a link token.
async function captureToken(email) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const files = readdirSync(capture, { recursive: true })
      .map((file) => path.join(capture, String(file)))
      .filter((file) => statSync(file).isFile())
      .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      const token = text.includes(email) ? /token=([A-Za-z0-9_-]+)/.exec(text) : null;
      if (token) return token[1];
    }
    await sleep(1000);
  }
  throw new Error(`no captured email for ${email}`);
}

const lucia = await login("lucia@example.com");
const branches = await must("GET", "/branches", lucia);
const centro = branches.find((branch) => branch.name === "Centro");
const day = (offset) => new Date(Date.now() + offset * 24 * 60 * minute).toISOString();
const sessions = await must(
  "GET",
  `/sessions?branchId=${centro.id}&from=${day(1)}&until=${day(6)}&limit=50`,
  lucia,
);
for (const session of sessions.slice(0, 2)) {
  await must("POST", `/sessions/${session.id}/bookings`, lucia, {});
}
console.log("Lucía booked 2 classes");

for (const friend of [
  { name: "Camila Rojas", email: "camila.rojas.amiga@example.com" },
  { name: "Sofía Vargas", email: "sofia.vargas.amiga@example.com" },
]) {
  await must("POST", "/client-registrations", null, {
    ...friend,
    password,
    referralCode: "LUCIA",
    acquisitionChannel: "friend",
  });
  const verificationToken = await captureToken(friend.email);
  await must("POST", "/client-email-verifications", null, { verificationToken });
  console.log(`${friend.name} registered with LUCIA`);
}

const paola = await login("paola.mendoza@example.com");
const classTypes = await must("GET", "/class-types", paola);
const staff = (await must("GET", "/administrator/staff-members", paola)).items;
const daniela = staff.find((member) => member.name === "Daniela Ortiz");
const reformer = classTypes.find((type) => type.name === "Reformer Pilates");
const startsAt = new Date(Math.ceil((Date.now() + 4 * minute) / (5 * minute)) * 5 * minute);
let session = null;
for (let step = 0; session === null && step < 12; step += 1) {
  const created = await request("POST", "/administrator/sessions", paola, {
    branchId: centro.id,
    classTypeId: reformer.id,
    trainerStaffMemberId: daniela.id,
    startsAt: new Date(startsAt.getTime() + step * 5 * minute).toISOString(),
    durationMinutes: 50,
    capacity: 12,
  });
  if (created.status < 300) session = created.data;
}
if (session === null) throw new Error("no free slot for Daniela's class");
for (const email of ["lucia@example.com", "valeria@example.com"]) {
  // A failed booking leaves the class under the 2-booking minimum, and the
  // worker would cancel it before the photo: stop instead.
  await must("POST", `/sessions/${session.id}/bookings`, await login(email), {});
  console.log(`${email} booked Daniela's class`);
}
console.log(`Daniela's class starts at ${session.startsAt}`);
