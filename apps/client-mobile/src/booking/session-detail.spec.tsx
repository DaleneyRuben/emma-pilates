import { cleanup, fireEvent, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache, createMemoryPushPlatform } from "@pilates/mobile-core";

import { jsonResponse, studioRules } from "../test-support";
import {
  classType,
  detail,
  insideWindowStartsAt,
  openDetail,
} from "./session-detail-test-support";

jest.setTimeout(20_000);

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

    // Follow-up 227 (C04): the hero carries the time and the seats; the
    // Trainer, the Branch and the free-cancellation limit are icon rows.
    const facts = within(screen.getByTestId("session-facts"));
    expect(facts.getByText("Emma Vargas")).toBeOnTheScreen();
    expect(facts.getByText("Entrenadora")).toBeOnTheScreen();
    expect(facts.getByText("Centro")).toBeOnTheScreen();
    expect(facts.getByText(/^Cancela sin costo hasta las \d{2}:\d{2}$/)).toBeOnTheScreen();
    expect(screen.getByText(/ · 75 minutos$/)).toBeOnTheScreen();
    expect(screen.getByText("de 12 cupos libres")).toBeOnTheScreen();
    expect(screen.getByText(classType.description)).toBeOnTheScreen();
    expect(screen.getByText("Se descuenta 1 clase de tu plan")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Reservar" }));

    await waitFor(() => {
      expect(screen.getByText("Reserva confirmada")).toBeOnTheScreen();
    });
    expect(booked).toHaveBeenCalledWith(expect.stringMatching(/^[0-9a-f-]{36}$/));
    expect(screen.getByText("Te quedan 4 clases en tu plan")).toBeOnTheScreen();
    // Follow-up 225 §7: the toast stays until its × closes it.
    await fireEvent.press(screen.getByRole("button", { name: "Cerrar aviso" }));
    await waitFor(() => expect(screen.queryByText("Reserva confirmada")).toBeNull());
  });

  it("does not count plan classes after a guest pass booking", async () => {
    let spent = false;
    const guest = () => ({
      status: "active" as const,
      subscription: {
        id: "subscription-guest",
        planName: "Pase de invitada",
        originalClassAllowance: 1,
        remainingClassAllowance: spent ? 0 : 1,
        startsOn: "2026-09-11",
        endsOn: "2026-10-11",
      },
    });
    const { screen } = await openDetail({
      "/api/v1/clients/current/subscription": () => jsonResponse(guest()),
      "POST /api/v1/sessions/session-1/bookings": () => {
        spent = true;
        return jsonResponse({ id: "booking-guest" }, 201);
      },
    });
    await fireEvent.press(screen.getByRole("button", { name: "Reservar" }));
    await waitFor(() => expect(screen.getByText("Reserva confirmada")).toBeOnTheScreen());
    expect(screen.queryByText(/Te quedan \d+ clases en tu plan/)).toBeNull();
    expect(screen.getByText("Tu pase de invitada ya se usó.")).toBeOnTheScreen();
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

    expect(screen.getByText("La lista de espera no usa clases de tu plan")).toBeOnTheScreen();
    expect(screen.getByText("Te avisamos si se libera un cupo")).toBeOnTheScreen();
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
    // Walkthrough n.º 16: the owner's global copy for the Client app.
    expect(screen.getByText("No te pierdas ninguna clase")).toBeOnTheScreen();
    expect(
      screen.getByText(
        "Te avisamos antes de cada clase y cuando haya novedades sobre tus reservas, tu plan o tus pagos.",
      ),
    ).toBeOnTheScreen();
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
    ["booking_window_exceeded", "Esa clase todavía no abre para reservar."],
  ])("names a refused booking by %s", async (code, message) => {
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
