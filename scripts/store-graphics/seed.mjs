// Seeds a fresh fixtures database, through the API, with what the store
// screenshots show (docs/store/play-listings.md#graphics). The fixtures'
// «Centro» becomes the studio's real branch, Achumani, and the other
// branches and Pilates Prenatal are archived, so every picker and filter
// reads like the studio: Reformer Pilates and Mat Pilates. Then Lucía's next two
// classes, two friends registered with her code, and a class of Daniela's
// that starts a few minutes from now with two Clients booked, so its roster
// can be photographed while attendance is open.
//
//   API_URL=http://127.0.0.1:3130/api/v1 node scripts/store-graphics/seed.mjs
//
// Needs the API and the worker on that database: the friends confirm their
// email with the token the worker writes to the local email capture.
import { randomUUID } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
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
    const files = (existsSync(capture) ? readdirSync(capture, { recursive: true }) : [])
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

const paola = await login("paola.mendoza@example.com");
const adminBranches = await must("GET", "/branches", paola);
const centro = adminBranches.find((branch) => branch.name === "Centro" || branch.name === "Achumani");
await must("PUT", `/administrator/branches/${centro.id}`, paola, { name: "Achumani", address: "Calle 21 de Achumani 450" });
// A branch or class type with a running schedule cannot be archived: end
// those schedules today (La Paz date) first.
const classTypes = await must("GET", "/class-types", paola);
const prenatal = classTypes.find((type) => type.name === "Pilates Prenatal");
const laPazToday = new Date(Date.now() - 4 * 60 * minute).toISOString().slice(0, 10);
for (const schedule of await must("GET", "/administrator/session-schedules", paola)) {
  if (schedule.branchId === centro.id && schedule.classTypeId !== prenatal?.id) continue;
  if (schedule.effectiveUntil !== null && schedule.effectiveUntil <= laPazToday) continue;
  await must("POST", `/administrator/session-schedules/${schedule.id}/end`, paola, { effectiveFrom: laPazToday });
}
for (const branch of adminBranches.filter((other) => other.id !== centro.id && other.archivedAt == null)) {
  const archived = await request("POST", `/administrator/branches/${branch.id}/archive`, paola, {});
  console.log(`archive ${branch.name}: ${archived.status}`);
}
if (prenatal) {
  const archived = await request("POST", `/administrator/class-types/${prenatal.id}/archive`, paola, {});
  console.log(`archive Pilates Prenatal: ${archived.status}`);
}
console.log("branch Centro is now Achumani");

const lucia = await login("lucia@example.com");
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

// The fixtures' schedule has two classes a day. The «Reservar» shots show
// the day three days from now (La Paz), filled out like a real studio day:
// morning and evening Reformer and Mat classes. Lucía books none of them, so
// her Plan still shows classes left on «Inicio».
const emma = staff.find((member) => member.name === "Emma Vargas");
const mat = classTypes.find((type) => type.name === "Mat Pilates");
const showcase = new Date(Date.now() - 4 * 60 * minute + 3 * 24 * 60 * minute).toISOString().slice(0, 10);
const laPaz = (time) => new Date(`${showcase}T${time}:00-04:00`).toISOString();
const valeria = await login("valeria@example.com");
for (const extra of [
  { time: "07:00", type: reformer, trainer: emma, book: [valeria] },
  { time: "08:00", type: reformer, trainer: daniela, book: [] },
  { time: "10:15", type: mat, trainer: emma, book: [] },
  { time: "19:45", type: mat, trainer: daniela, book: [] },
]) {
  const created = await request("POST", "/administrator/sessions", paola, {
    branchId: centro.id,
    classTypeId: extra.type.id,
    trainerStaffMemberId: extra.trainer.id,
    startsAt: laPaz(extra.time),
    durationMinutes: 50,
    capacity: extra.type.name === "Mat Pilates" ? 14 : 12,
  });
  console.log(`${showcase} ${extra.time} ${extra.type.name}: ${created.status}`);
  if (created.status >= 300) continue;
  for (const token of extra.book) await must("POST", `/sessions/${created.data.id}/bookings`, token, {});
}
console.log(`the Reservar shots show ${showcase}`);
