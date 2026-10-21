// Seeds or looks up what a Staff journey needs through the API (Maestro
// runScript, GraalJS: no imports, no async). Run with env API_URL, PASSWORD
// and SEED:
// - "open-session": a Reformer Session tomorrow at Centro with every seat
//   free, for the Assistant's booking (output.sessionId, output.date,
//   output.time as HH:MM).
// - "booked-session": the same, booked by Lucía, for the Administrator's
//   cancellation (output.sessionId, output.date).
// - "new-client": a fresh email for the invitation (output.email).
// - "finished-session": the Session seed.mjs left for Emma with a booking
//   (output.sessionId); fails when seed.mjs has not run.
// - "pending-transfers": Mariana's and Sofía's transfers seed.mjs left for
//   review (output.confirmId, output.rejectId).
// Dates are YYYY-MM-DD in Bolivia, as the screens' day chips name them.

var api = API_URL.replace(/\/$/, "") + "/api/v1";
var minute = 60 * 1000;
var boliviaOffset = -4 * 60 * minute;

function request(method, path, token, body, headers) {
  var allHeaders = { "Content-Type": "application/json" };
  if (token) allHeaders.Authorization = "Bearer " + token;
  for (var name in headers || {}) allHeaders[name] = headers[name];
  var options = { method: method, headers: allHeaders };
  if (body !== undefined) options.body = JSON.stringify(body);
  var response = http.request(api + path, options);
  return {
    ok: response.ok,
    status: response.status,
    data: response.body ? json(response.body) : null,
  };
}

function must(result, what) {
  if (!result.ok)
    throw new Error(what + " failed: " + result.status + " " + JSON.stringify(result.data));
  return result.data;
}

function login(email) {
  return must(
    request("POST", "/authentication-sessions", null, { email: email, password: PASSWORD }),
    "login " + email,
  ).credential;
}

function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = Math.floor(Math.random() * 16);
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function boliviaDate(instant) {
  return new Date(instant.getTime() + boliviaOffset).toISOString().slice(0, 10);
}

function find(list, name) {
  for (var i = 0; i < list.length; i += 1) if (list[i].name === name) return list[i];
  throw new Error("no " + name);
}

// The first free start from `from`, stepping 15 minutes, with either Trainer:
// a fixture Session at Centro or the Trainer's own may already hold a slot.
function createTomorrowSession(admin, hour) {
  var centro = find(must(request("GET", "/branches", admin), "branches"), "Centro");
  var reformer = find(
    must(request("GET", "/class-types", admin), "class types"),
    "Reformer Pilates",
  );
  var staff = must(request("GET", "/administrator/staff-members", admin), "staff").items;
  var trainers = [find(staff, "Emma Vargas"), find(staff, "Daniela Ortiz")];
  var date = boliviaDate(new Date(Date.now() + 24 * 60 * minute));
  var from = new Date(date + "T" + hour + ":00-04:00");
  for (var step = 0; step < 8; step += 1) {
    for (var t = 0; t < trainers.length; t += 1) {
      var created = request("POST", "/administrator/sessions", admin, {
        branchId: centro.id,
        classTypeId: reformer.id,
        trainerStaffMemberId: trainers[t].id,
        startsAt: new Date(from.getTime() + step * 15 * minute).toISOString(),
        durationMinutes: 50,
      });
      if (created.ok) return { session: created.data, date: date };
    }
  }
  throw new Error("no free Centro slot tomorrow from " + hour);
}

if (SEED === "open-session" || SEED === "booked-session") {
  var admin = login("paola.mendoza@example.com");
  // 05:00 and 05:15 come before the fixtures' first class of the day.
  var seeded = createTomorrowSession(admin, SEED === "open-session" ? "05:00" : "06:00");
  if (SEED === "booked-session") {
    must(
      request(
        "POST",
        "/sessions/" + seeded.session.id + "/bookings",
        login("lucia@example.com"),
        {},
        { "Idempotency-Key": uuid() },
      ),
      "booking",
    );
  }
  output.sessionId = seeded.session.id;
  output.date = seeded.date;
  output.time = new Date(new Date(seeded.session.startsAt).getTime() + boliviaOffset)
    .toISOString()
    .slice(11, 16);
} else if (SEED === "new-client") {
  output.email = "maestro." + Date.now() + "@example.com";
} else if (SEED === "finished-session") {
  var emma = login("emma.vargas@example.com");
  var today = boliviaDate(new Date());
  var agenda = must(request("GET", "/trainer/sessions?on=" + today, emma), "agenda");
  var sessions = agenda.items || agenda.data || agenda;
  for (var i = 0; i < sessions.length; i += 1) {
    if (
      sessions[i].bookedCount > 0 &&
      new Date(sessions[i].endsAt).getTime() - new Date(sessions[i].startsAt).getTime() <=
        5 * minute
    ) {
      output.sessionId = sessions[i].sessionId;
    }
  }
  if (!output.sessionId) throw new Error("no finished Session: run .maestro/seed.mjs first");
} else if (SEED === "pending-transfers") {
  var pending = must(
    request("GET", "/administrator/payments/pending", login("paola.mendoza@example.com")),
    "pending",
  );
  var payments = pending.items || pending.data || pending;
  for (var p = 0; p < payments.length; p += 1) {
    if (payments[p].clientName.indexOf("Mariana") === 0) output.confirmId = payments[p].id;
    if (payments[p].clientName.indexOf("Sofía") === 0) output.rejectId = payments[p].id;
  }
  if (!output.confirmId || !output.rejectId)
    throw new Error("no seeded transfers: run .maestro/seed.mjs first");
} else {
  throw new Error("unknown SEED " + SEED);
}
