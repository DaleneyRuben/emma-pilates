import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache, createMemoryPushPlatform } from "@pilates/mobile-core";

import App from "../../App";
import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";
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
  durationMinutes: 50,
};
const startsAt = new Date(Date.now() + 60 * 60 * 1_000);
const endsAt = new Date(startsAt.getTime() + 50 * 60 * 1_000);
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

const detail = (availableSeats: number) => ({
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
});

async function openDetail(
  routes: Parameters<typeof routeFetcher>[0],
  remaining = 5,
  availableSeats = 3,
  runtime: Parameters<typeof createClientRuntime>[1] = {},
) {
  let subscriptionRemaining = remaining;
  const fetcher = routeFetcher({
    "/api/v1/clients/current": () => jsonResponse(profile),
    "/api/v1/clients/current/subscription": () => jsonResponse(subscription(subscriptionRemaining)),
    "/api/v1/branches": () => jsonResponse([branch]),
    "/api/v1/class-types": () => jsonResponse([classType]),
    [listUrl]: () => jsonResponse([listed(availableSeats)]),
    "/api/v1/sessions/session-1": () => jsonResponse(detail(availableSeats)),
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
    expect(screen.getByText("Centro")).toBeOnTheScreen();
    expect(screen.getByText("50 minutos")).toBeOnTheScreen();
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

  it("disables booking without remaining classes and links to the Plans", async () => {
    const { screen } = await openDetail({}, 0, 3);

    expect(screen.getByRole("button", { name: "Reservar" })).toBeDisabled();
    expect(screen.getByText("No te quedan clases en tu plan.")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Comprar un plan" }));

    await waitFor(() => {
      expect(screen.getByText("Elige tu plan")).toBeOnTheScreen();
    });
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
});
