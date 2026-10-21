// Seeds what a Client journey needs through the API (Maestro runScript,
// GraalJS: no imports, no async). Run with env API_URL, PASSWORD and SEED:
// - "full-session": a one-seat Reformer Session tomorrow at Centro, booked by
//   Valeria, for the Waitlist journey.
// - "reschedule": Lucía's booking on a Session starting in about 10 minutes
//   (inside the 2 h 30 cancellation window, so 05 offers «Reprogramar») and
//   a later Session the same day booked by Valeria (a booked Session survives
//   the worker's empty-class check) to move it to.
// Writes output.sessionId, output.targetId, output.targetTime (HH:MM) and
// output.date (YYYY-MM-DD), both in Bolivia, for the flow's selectors.

var api = API_URL.replace(/\/$/, "") + "/api/v1";
var minute = 60 * 1000;
var boliviaOffset = -4 * 60 * minute;

function request(method, path, token, body, headers) {
  var allHeaders = { "Content-Type": "application/json" };
  if (token) allHeaders.Authorization = "Bearer " + token;
  for (var name in headers || {}) allHeaders[name] = headers[name];
  var options = { headers: allHeaders };
  if (body !== undefined) options.body = JSON.stringify(body);
  var response = http.request(api + path, Object.assign({ method: method }, options));
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

var admin = login("paola.mendoza@example.com");
var centro = find(must(request("GET", "/branches", admin), "branches"), "Centro");
var reformer = find(must(request("GET", "/class-types", admin), "class types"), "Reformer Pilates");
var staff = must(request("GET", "/administrator/staff-members", admin), "staff").items;
var trainers = [find(staff, "Emma Vargas"), find(staff, "Daniela Ortiz")];

// The first free start from `from`, stepping 15 minutes, with either Trainer:
// a fixture Session at Centro or the Trainer's own may already hold a slot.
function createSession(from, minutes, capacity) {
  for (var step = 0; step < 24; step += 1) {
    var startsAt = new Date(from.getTime() + step * 15 * minute);
    for (var t = 0; t < trainers.length; t += 1) {
      var created = request("POST", "/administrator/sessions", admin, {
        branchId: centro.id,
        classTypeId: reformer.id,
        trainerStaffMemberId: trainers[t].id,
        startsAt: startsAt.toISOString(),
        durationMinutes: minutes,
        capacity: capacity,
      });
      if (created.ok) return created.data;
    }
  }
  throw new Error("no free Centro slot after " + from.toISOString());
}

function book(token, sessionId) {
  return must(
    request(
      "POST",
      "/sessions/" + sessionId + "/bookings",
      token,
      {},
      { "Idempotency-Key": uuid() },
    ),
    "booking",
  );
}

function roundedUp(instant, minutes) {
  var step = minutes * minute;
  return new Date(Math.ceil(instant.getTime() / step) * step);
}

if (SEED === "full-session") {
  // Tomorrow at 05:00 in Bolivia, before the fixtures' first class.
  var tomorrow = boliviaDate(new Date(Date.now() + 24 * 60 * minute));
  var full = createSession(new Date(tomorrow + "T05:00:00-04:00"), 50, 1);
  book(login("valeria@example.com"), full.id);
  output.sessionId = full.id;
  output.date = tomorrow;
} else if (SEED === "reschedule") {
  // Ten-minute classes keep both on the same day until about 23:30.
  var source = createSession(roundedUp(new Date(Date.now() + 10 * minute), 5), 10, undefined);
  var target = createSession(
    new Date(new Date(source.endsAt).getTime() + 5 * minute),
    10,
    undefined,
  );
  if (boliviaDate(new Date(source.startsAt)) !== boliviaDate(new Date(target.startsAt))) {
    throw new Error("too late in the day: the two Sessions fall on different days");
  }
  book(login("lucia@example.com"), source.id);
  book(login("valeria@example.com"), target.id);
  output.sessionId = source.id;
  output.targetId = target.id;
  output.targetTime = new Date(new Date(target.startsAt).getTime() + boliviaOffset)
    .toISOString()
    .slice(11, 16);
  output.date = boliviaDate(new Date(source.startsAt));
} else {
  throw new Error("unknown SEED " + SEED);
}
