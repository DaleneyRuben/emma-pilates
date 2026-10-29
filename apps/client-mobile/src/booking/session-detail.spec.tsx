import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache, createMemoryPushPlatform } from "@pilates/mobile-core";

import App from "../../App";
import { createClientRuntime, jsonResponse, routeFetcher, studioRules } from "../test-support";
import { boliviaCivilDate, civilDateRange } from "@pilates/mobile-core";

jest.setTimeout(20_000);

const profile = {
  id: "client-1",
  name: "Lucía Fernández",
  email: "lucia@example.com",
  phone: null,
  referralCode: "REF-LUCIA",
};

const subscription = (remaining: number) => ({
  status: "active",
  subscription: {
    id: "subscription-1",
    planName: "Paquete de 8 clases",
    originalClassAllowance: 8,
    remainingClassAllowance: remaining,
    startsOn: "2026-09-11",
    endsOn: "2026-10-11",
  },
});

const branch = { id: "branch-centro", name: "Centro", address: "Calle Ayacucho 245" };
const classType = {
  id: "class-reformer",
  name: "Reformer Pilates",
  description: "Clase de Pilates con Reformer, ideal para tonificar todo el cuerpo.",
  // Deprecated: the Session's own minutes come from startsAt and endsAt
  // (WEB-027, booking ADR-0004).
  durationMinutes: 60,
};
// Outside the seeded 2 h 30 window, so a full Session still offers the Waitlist.
const startsAt = new Date(Date.now() + 4 * 60 * 60 * 1_000);
const endsAt = new Date(startsAt.getTime() + 75 * 60 * 1_000);
const insideWindowStartsAt = new Date(Date.now() + 60 * 60 * 1_000);
const { from, until } = civilDateRange(boliviaCivilDate(new Date()));
const listUrl = `/api/v1/sessions?branchId=branch-centro&from=${encodeURIComponent(from)}&until=${encodeURIComponent(until)}&limit=100`;

const listed = (availableSeats: number) => ({
  id: "session-1",
  branchId: branch.id,
  classTypeId: classType.id,
  trainerStaffMemberId: "trainer-1",
  classTypeName: classType.name,
  trainerName: "Emma Vargas",
  startsAt: startsAt.toISOString(),
  endsAt: endsAt.toISOString(),
  capacity: 12,
  bookedCount: 12 - availableSeats,
  availableSeats,
  waitlistCount: 0,
});

const detail = (availableSeats: number, classesLeftThisWeek?: number | null) => ({
  id: "session-1",
  branch,
  classType,
  trainerName: "Emma Vargas",
  startsAt: startsAt.toISOString(),
  endsAt: endsAt.toISOString(),
  capacity: 12,
  bookedCount: 12 - availableSeats,
  availableSeats,
  waitlistCount: 0,
  ...(classesLeftThisWeek === undefined ? {} : { classesLeftThisWeek }),
});

async function openDetail(
  routes: Parameters<typeof routeFetcher>[0],
  remaining = 5,
  availableSeats = 3,
  runtime: Parameters<typeof createClientRuntime>[1] = {},
  sessionStartsAt = startsAt,
) {
  let subscriptionRemaining = remaining;
  const fetcher = routeFetcher({
    "/api/v1/clients/current": () => jsonResponse(profile),
    "/api/v1/clients/current/subscription": () => jsonResponse(subscription(subscriptionRemaining)),
    "/api/v1/branches": () => jsonResponse([branch]),
    "/api/v1/class-types": () => jsonResponse([classType]),
    [listUrl]: () =>
      jsonResponse([
        {
          ...listed(availableSeats),
          startsAt: sessionStartsAt.toISOString(),
          endsAt: new Date(sessionStartsAt.getTime() + 75 * 60 * 1_000).toISOString(),
        },
      ]),
    "/api/v1/sessions/session-1": () =>
      jsonResponse({
        ...detail(availableSeats),
        startsAt: sessionStartsAt.toISOString(),
        endsAt: new Date(sessionStartsAt.getTime() + 75 * 60 * 1_000).toISOString(),
      }),
    ...routes,
  });
  const screen = await render(<App runtime={createClientRuntime(fetcher, runtime)} />);

  await waitFor(
    () => {
      expect(screen.getByRole("button", { name: /Reservar, tab/ })).toBeOnTheScreen();
    },
    { timeout: 10_000 },
  );
  await fireEvent.press(screen.getByRole("button", { name: /Reservar, tab/ }));
  await waitFor(
    () => {
      expect(screen.getByRole("button", { name: /^Reformer Pilates \d/ })).toBeOnTheScreen();
    },
    { timeout: 5_000 },
  );
  await fireEvent.press(screen.getByRole("button", { name: /^Reformer Pilates \d/ }));
  await waitFor(() => {
    expect(screen.getByText("Sobre la clase")).toBeOnTheScreen();
  });

  return {
    screen,
    fetcher,
    consumeAllowance: () => {
      subscriptionRemaining -= 1;
    },
  };
}

describe("Client Session detail", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("shows the Session facts and books with an idempotency key", async () => {
    const booked = jest.fn();
    const { screen, consumeAllowance } = await openDetail({
      "POST /api/v1/sessions/session-1/bookings": (init) => {
        booked(new Headers(init?.headers).get("idempotency-key"));
        consumeAllowance();
        return jsonResponse({ id: "booking-1" }, 201);
      },
    });

    expect(screen.getByText("Emma Vargas")).toBeOnTheScreen();
    // UX-012 / C4: 04 writes the credential under the Trainer's name.
    expect(screen.getByText("Entrenadora certificada")).toBeOnTheScreen();
    expect(screen.getByText("Centro")).toBeOnTheScreen();
    expect(screen.getByText("75 minutos")).toBeOnTheScreen();
    expect(screen.getByText("3 de 12 cupos disponibles")).toBeOnTheScreen();
    expect(screen.getByText(classType.description)).toBeOnTheScreen();
    expect(screen.getByText("Se descontará 1 clase de tu paquete.")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Reservar" }));

    await waitFor(() => {
      expect(screen.getByText("Reserva confirmada")).toBeOnTheScreen();
    });
    expect(booked).toHaveBeenCalledWith(expect.stringMatching(/^[0-9a-f-]{36}$/));
    expect(screen.getByText("Te quedan 4 clases en tu plan")).toBeOnTheScreen();
  });

  // MOB-070: joining inside the Cancellation Window is refused, so the
  // detail must not offer it. The window length comes from the studio rules.
  it("does not offer the Waitlist inside the Cancellation Window", async () => {
    const { screen } = await openDetail(
      {
        "/api/v1/studio-rules": () =>
          jsonResponse({ ...studioRules, cancellationWindowMinutes: 90 }),
      },
      5,
      0,
      {},
      insideWindowStartsAt,
    );

    expect(
      screen.queryByRole("button", { name: "Unirme a la lista de espera" }),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByText("Falta poco para la clase, así que la lista de espera ya cerró."),
    ).toBeOnTheScreen();
  });

  it("offers the Waitlist when the Session is full", async () => {
    const joined = jest.fn();
    const { screen } = await openDetail(
      {
        "POST /api/v1/sessions/session-1/waitlist-entries": () => {
          joined();
          return jsonResponse({ id: "entry-1" }, 201);
        },
      },
      5,
      0,
    );

    expect(screen.getByText("Clase llena. Te avisaremos si se libera un cupo.")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Reservar" })).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Unirme a la lista de espera" }));

    await waitFor(() => {
      expect(screen.getByText("Ya estás en la lista de espera.")).toBeOnTheScreen();
    });
    expect(joined).toHaveBeenCalled();
  });

  // ADR-0067: the explanation follows the action that makes push useful.
  it("offers notifications once the Booking is confirmed", async () => {
    const { platform } = createMemoryPushPlatform("undetermined");
    const { screen } = await openDetail(
      {
        "POST /api/v1/sessions/session-1/bookings": () => jsonResponse({ id: "booking-1" }, 201),
      },
      5,
      3,
      { pushPlatform: platform },
    );

    await fireEvent.press(screen.getByRole("button", { name: "Reservar" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Activar notificaciones" })).toBeOnTheScreen();
    });
  });

  it("offers notifications once the Client joins the Waitlist", async () => {
    const { platform } = createMemoryPushPlatform("undetermined");
    const { screen } = await openDetail(
      {
        "POST /api/v1/sessions/session-1/waitlist-entries": () =>
          jsonResponse({ id: "entry-1" }, 201),
      },
      5,
      0,
      { pushPlatform: platform },
    );

    await fireEvent.press(screen.getByRole("button", { name: "Unirme a la lista de espera" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Activar notificaciones" })).toBeOnTheScreen();
    });
  });

  it("lets a guest pass book from the courtesy class", async () => {
    const { screen } = await openDetail({
      "/api/v1/clients/current/subscription": () =>
        jsonResponse({
          status: "active",
          subscription: {
            id: "pass-1",
            planName: "Pase de invitada",
            originalClassAllowance: 1,
            remainingClassAllowance: 0,
            startsOn: "2026-10-29",
            endsOn: "2026-11-27",
            extraClassesLine: "Clases extra: 1 · Cortesía",
          },
        }),
    });

    expect(screen.getByRole("button", { name: "Reservar" })).toBeEnabled();
    expect(screen.queryByText("No te quedan clases en tu plan.")).toBeNull();
  });

  it("disables booking without remaining classes and links to the Plans", async () => {
    const { screen } = await openDetail({}, 0, 3);

    expect(screen.getByRole("button", { name: "Reservar" })).toBeDisabled();
    expect(screen.getByText("No te quedan clases en tu plan.")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Comprar un plan" }));

    await waitFor(() => {
      expect(screen.getByText("Elige tu plan")).toBeOnTheScreen();
    });
  });

  it("shows the classes left this week from the Session field", async () => {
    const { screen } = await openDetail({
      "/api/v1/sessions/session-1": () => jsonResponse(detail(3, 0)),
    });

    expect(screen.getByText("Te quedan 0 clases esta semana")).toBeOnTheScreen();
  });

  it("explains a rejected Booking with the problem code", async () => {
    const { screen } = await openDetail({
      "POST /api/v1/sessions/session-1/bookings": () =>
        jsonResponse({ code: "booking_overlap", status: 409, title: "Conflict" }, 409),
    });

    await fireEvent.press(screen.getByRole("button", { name: "Reservar" }));

    await waitFor(() => {
      expect(screen.getByText("Ya tienes una reserva a esa hora.")).toBeOnTheScreen();
    });
  });

  it.each([
    ["guest_pass_last_place", "Un pase de invitada no puede tomar el último lugar."],
    ["guest_pass_already_used", "Tu pase de invitada ya se usó."],
  ])("names a refused guest pass booking by %s", async (code, message) => {
    const { screen } = await openDetail({
      "POST /api/v1/sessions/session-1/bookings": () =>
        jsonResponse({ code, status: 409, title: "Conflict" }, 409),
    });

    await fireEvent.press(screen.getByRole("button", { name: "Reservar" }));

    await waitFor(() => {
      expect(screen.getByText(message)).toBeOnTheScreen();
    });
  });

  it("explains a weekly cap refusal from the problem code", async () => {
    const { screen } = await openDetail({
      "POST /api/v1/sessions/session-1/bookings": () =>
        jsonResponse({ code: "weekly_cap_reached", status: 409, title: "Conflict" }, 409),
    });

    await fireEvent.press(screen.getByRole("button", { name: "Reservar" }));

    await waitFor(() => {
      expect(screen.getByText("Ya usaste tus clases de esta semana.")).toBeOnTheScreen();
    });
  });
});
