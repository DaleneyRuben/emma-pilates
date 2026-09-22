import {
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react-native";
import {
  boliviaCivilDate,
  civilDateRange,
  clearMobileQueryCache,
} from "@pilates/mobile-core";

import App from "../../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(20_000);

const minute = 60_000;
const hour = 60 * minute;

const assistant = {
  id: "staff-3",
  name: "Camila Rojas",
  email: "camila.rojas@example.com",
  phone: null,
  role: "assistant",
  branches: [{ id: "branch-centro", name: "Centro" }],
};

const lucia = {
  id: "client-lucia",
  name: "Lucía Fernández",
  email: "lucia@example.com",
  phone: "+591 70011001",
  accountStatus: "active",
};

const subscription = {
  id: "subscription-1",
  planName: "Paquete de 8 clases",
  originalClassAllowance: 8,
  remainingClassAllowance: 5,
  startsOn: "2026-09-12",
  endsOn: "2026-10-12",
};

const facts = (
  sessionId: string,
  branchId: string,
  startsAt: Date,
  classTypeName = "Reformer Pilates",
) => ({
  sessionId,
  branchId,
  classTypeName,
  trainerName: "Emma Vargas",
  branchName: branchId === "branch-centro" ? "Centro" : "Urubó",
  startsAt: startsAt.toISOString(),
  endsAt: new Date(startsAt.getTime() + 50 * minute).toISOString(),
});

const farBooking = {
  kind: "booking",
  bookingId: "booking-far",
  actionable: true,
  ...facts("session-far", "branch-centro", new Date(Date.now() + 26 * hour)),
};
const soonBooking = {
  kind: "booking",
  bookingId: "booking-soon",
  actionable: true,
  ...facts(
    "session-soon",
    "branch-centro",
    new Date(Date.now() + 60 * minute),
    "Mat Pilates",
  ),
};
const waitlistEntry = {
  kind: "waitlist",
  waitlistEntryId: "entry-1",
  actionable: false,
  ...facts(
    "session-urubo",
    "branch-urubo",
    new Date(Date.now() + 48 * hour),
    "Pilates Prenatal",
  ),
};

const history = [
  {
    bookingId: "past-1",
    ...facts("session-p1", "branch-centro", new Date("2026-09-15T13:00:00.000Z")),
  },
  {
    bookingId: "past-2",
    ...facts(
      "session-p2",
      "branch-centro",
      new Date("2026-09-08T13:00:00.000Z"),
      "Mat Pilates",
    ),
  },
  {
    bookingId: "past-3",
    ...facts("session-p3", "branch-centro", new Date("2026-08-20T13:00:00.000Z")),
  },
];

const overview = {
  client: lucia,
  subscription: { status: "active", subscription },
  nextBooking: farBooking,
  recentHistory: history.slice(0, 2),
  creditAvailableCentavos: 6_000,
};

const planQuotes = {
  creditAvailableCentavos: 6_000,
  plans: [
    {
      id: "plan-8",
      name: "Paquete de 8 clases",
      durationMonths: 1,
      classAllowance: 8,
      priceCentavos: 56_000,
      creditAppliedCentavos: 6_000,
      amountDueCentavos: 50_000,
    },
    {
      id: "plan-12",
      name: "Paquete de 12 clases",
      durationMonths: 1,
      classAllowance: 12,
      priceCentavos: 78_000,
      creditAppliedCentavos: 6_000,
      amountDueCentavos: 72_000,
    },
  ],
};

const today = boliviaCivilDate(new Date());
const { from, until } = civilDateRange(today);
const sessionStart = new Date(Date.now() + 3 * hour);
const session = {
  id: "session-1",
  branchId: "branch-centro",
  classTypeId: "class-reformer",
  trainerStaffMemberId: "trainer-1",
  classTypeName: "Reformer Pilates",
  trainerName: "Emma Vargas",
  startsAt: sessionStart.toISOString(),
  endsAt: new Date(sessionStart.getTime() + 50 * minute).toISOString(),
  capacity: 12,
  bookedCount: 6,
  availableSeats: 6,
  waitlistCount: 0,
};
const sessionDetail = {
  id: "session-1",
  branch: { id: "branch-centro", name: "Centro", address: "Calle Ayacucho 245" },
  classType: {
    id: "class-reformer",
    name: "Reformer Pilates",
    description: "Trabajo de fuerza y control en el reformer.",
    durationMinutes: 50,
  },
  trainerName: "Emma Vargas",
  startsAt: session.startsAt,
  endsAt: session.endsAt,
  capacity: 12,
  bookedCount: 6,
  availableSeats: 6,
  waitlistCount: 0,
};

const newClient = {
  id: "client-new",
  name: "Ana Nueva",
  email: "ana@example.com",
  phone: "+591 70000000",
  accountStatus: "pending",
};
const invitation = {
  clientId: "client-new",
  name: "Ana Nueva",
  email: "ana@example.com",
  phone: "+591 70000000",
  pendingExpiresAt: "2026-10-22T15:00:00.000Z",
  activationExpiresAt: "2026-09-29T15:00:00.000Z",
  cancellable: true,
};

function assistantRoutes() {
  return {
    "/api/v1/staff-members/current": () => jsonResponse(assistant),
    "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
    "/api/v1/assistant/clients?query=luc": () => jsonResponse([lucia]),
    "/api/v1/assistant/clients?query=zz": () => jsonResponse([]),
    "/api/v1/assistant/clients/client-lucia": () => jsonResponse(overview),
    "/api/v1/assistant/clients/client-lucia/bookings": () =>
      jsonResponse([farBooking, soonBooking, waitlistEntry]),
    "/api/v1/assistant/clients/client-lucia/class-history": () =>
      jsonResponse(history),
    "/api/v1/assistant/clients/client-lucia/plan-quotes": () =>
      jsonResponse(planQuotes),
    "/api/v1/branches": () =>
      jsonResponse([
        { id: "branch-centro", name: "Centro", address: "Calle Ayacucho 245" },
        { id: "branch-urubo", name: "Urubó", address: "Condominio Los Tajibos" },
      ]),
    "/api/v1/class-types": () =>
      jsonResponse([
        {
          id: "class-reformer",
          name: "Reformer Pilates",
          description: "",
          durationMinutes: 50,
        },
        { id: "class-mat", name: "Mat Pilates", description: "", durationMinutes: 50 },
      ]),
    [`/api/v1/sessions?branchId=branch-centro&from=${encodeURIComponent(from)}&until=${encodeURIComponent(until)}&limit=100`]:
      () => jsonResponse([session]),
    "/api/v1/sessions/session-1": () => jsonResponse(sessionDetail),
  };
}

async function openClientSearch(routes: Parameters<typeof routeFetcher>[0]) {
  const screen = await render(
    <App runtime={createStaffRuntime(routeFetcher(routes), "assistant")} />,
  );
  await waitFor(() => {
    expect(screen.getByLabelText("Buscar cliente")).toBeOnTheScreen();
  });
  return screen;
}

async function openLucia(routes: Parameters<typeof routeFetcher>[0]) {
  const screen = await openClientSearch(routes);
  fireEvent.changeText(
    screen.getByPlaceholderText("Buscar por nombre, teléfono o correo"),
    "luc",
  );
  await waitFor(() => {
    expect(
      screen.getByRole("button", { name: "Ver cliente Lucía Fernández" }),
    ).toBeOnTheScreen();
  });
  await fireEvent.press(
    screen.getByRole("button", { name: "Ver cliente Lucía Fernández" }),
  );
  await waitFor(() => {
    expect(screen.getByLabelText("Lucía Fernández")).toBeOnTheScreen();
  });
  return screen;
}

describe("Assistant Client flows", () => {
  afterEach(() => {
    cleanup();
    clearMobileQueryCache();
  });

  it("searches Clients and opens the overview with the Subscription, quick actions, and history preview", async () => {
    const screen = await openClientSearch(assistantRoutes());

    fireEvent.changeText(
      screen.getByPlaceholderText("Buscar por nombre, teléfono o correo"),
      "zz",
    );
    await waitFor(() => {
      expect(screen.getByText("No se encontró ningún cliente.")).toBeOnTheScreen();
    });

    fireEvent.changeText(
      screen.getByPlaceholderText("Buscar por nombre, teléfono o correo"),
      "luc",
    );
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Ver cliente Lucía Fernández" }),
      ).toBeOnTheScreen();
    });
    expect(screen.getByText("+591 70011001 · lucia@example.com")).toBeOnTheScreen();

    await fireEvent.press(
      screen.getByRole("button", { name: "Ver cliente Lucía Fernández" }),
    );
    await waitFor(() => {
      expect(screen.getByLabelText("Lucía Fernández")).toBeOnTheScreen();
    });
    expect(screen.getByText("Paquete de 8 clases")).toBeOnTheScreen();
    expect(screen.getByText("5 clases restantes")).toBeOnTheScreen();
    expect(screen.getByText("Vence el 12 de octubre de 2026")).toBeOnTheScreen();
    expect(screen.getByText("Activa")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Reservar clase" })).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Registrar pago en efectivo" }),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Ver reservas" })).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Ver historial completo" }),
    ).toBeOnTheScreen();
    expect(screen.getAllByText("Emma Vargas · Centro")).toHaveLength(2);
    expect(screen.getByText("Mat Pilates")).toBeOnTheScreen();
  });

  it("lists the Client's Bookings in their three states, cancels one after confirming, and shows the history by month", async () => {
    const cancelled = jest.fn();
    const screen = await openLucia({
      ...assistantRoutes(),
      "DELETE /api/v1/bookings/booking-far": () => {
        cancelled();
        return new Response(null, { status: 204 });
      },
    });

    await fireEvent.press(screen.getByRole("button", { name: "Ver reservas" }));
    await waitFor(() => {
      expect(screen.getByLabelText("Reservas de la clienta")).toBeOnTheScreen();
    });
    expect(
      screen.getByText("Viendo reservas de: Lucía Fernández"),
    ).toBeOnTheScreen();
    expect(screen.getByText("No cancelable")).toBeOnTheScreen();
    expect(screen.getByText("En lista de espera")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Reprogramar" })).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Salir de la lista de espera" }),
    ).toBeDisabled();
    expect(screen.getByText("Solo en tus sucursales")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Cancelar" }));
    await waitFor(() => {
      expect(
        screen.getByText("¿Cancelar esta reserva de Lucía Fernández?"),
      ).toBeOnTheScreen();
    });
    await fireEvent.press(
      screen.getByRole("button", { name: "Sí, cancelar reserva" }),
    );
    await waitFor(() => {
      expect(cancelled).toHaveBeenCalledTimes(1);
    });

    await fireEvent.press(screen.getByRole("button", { name: "Volver" }));
    await waitFor(() => {
      expect(screen.getByLabelText("Lucía Fernández")).toBeOnTheScreen();
    });
    await fireEvent.press(
      screen.getByRole("button", { name: "Ver historial completo" }),
    );
    await waitFor(() => {
      expect(screen.getByLabelText("Historial de clases")).toBeOnTheScreen();
    });
    expect(
      screen.getByText("Viendo historial de: Lucía Fernández"),
    ).toBeOnTheScreen();
    expect(screen.getByText("Septiembre 2026")).toBeOnTheScreen();
    expect(screen.getByText("Agosto 2026")).toBeOnTheScreen();
    expect(screen.getAllByText("Emma Vargas · Centro")).toHaveLength(2);
  });

  it("books a Session for the Client and lands on her Bookings with the confirmation", async () => {
    const booked = jest.fn();
    const screen = await openLucia({
      ...assistantRoutes(),
      "POST /api/v1/sessions/session-1/bookings": (init) => {
        booked(JSON.parse(String(init?.body)));
        return jsonResponse({ id: "booking-new" }, 201);
      },
    });

    await fireEvent.press(screen.getByRole("button", { name: "Reservar clase" }));
    await waitFor(() => {
      expect(screen.getByLabelText("Reservar una clase")).toBeOnTheScreen();
    });
    expect(screen.getByText("Reservando para: Lucía Fernández")).toBeOnTheScreen();
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /^Reformer Pilates \d/ }),
      ).toBeOnTheScreen();
    });
    await fireEvent.press(
      screen.getByRole("button", { name: /^Reformer Pilates \d/ }),
    );
    await waitFor(() => {
      expect(screen.getByText("6 de 12 cupos disponibles")).toBeOnTheScreen();
    });
    expect(screen.getByText("Reservando para: Lucía Fernández")).toBeOnTheScreen();
    expect(screen.getByText("Se descontará 1 clase de su plan.")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Reservar" }));
    await waitFor(() => {
      expect(screen.getByText("Reserva confirmada")).toBeOnTheScreen();
    });
    expect(booked).toHaveBeenCalledWith({ clientId: "client-lucia" });
    expect(screen.getByLabelText("Reservas de la clienta")).toBeOnTheScreen();
  });

  it("records a cash Payment with the Client's Credit applied and returns to the overview", async () => {
    const paid = jest.fn();
    const screen = await openLucia({
      ...assistantRoutes(),
      "POST /api/v1/assistant/clients/client-lucia/cash-payments": (init) => {
        paid({
          body: JSON.parse(String(init?.body)),
          idempotencyKey: new Headers(init?.headers).get("idempotency-key"),
        });
        return jsonResponse(
          {
            payment: {
              id: "payment-cash",
              method: "cash",
              state: "confirmed",
              planId: "plan-8",
              planName: "Paquete de 8 clases",
              durationMonths: 1,
              classAllowance: 8,
              planPriceCentavos: 56_000,
              creditAppliedCentavos: 6_000,
              amountDueCentavos: 50_000,
              submittedAt: new Date().toISOString(),
              decidedAt: new Date().toISOString(),
              rejectionReason: null,
              subscriptionId: "subscription-2",
            },
            subscription: {
              id: "subscription-2",
              planName: "Paquete de 8 clases",
              originalClassAllowance: 8,
              remainingClassAllowance: 8,
              startsOn: "2026-09-22",
              endsOn: "2026-10-22",
            },
          },
          201,
        );
      },
    });

    await fireEvent.press(
      screen.getByRole("button", { name: "Registrar pago en efectivo" }),
    );
    await waitFor(() => {
      expect(screen.getByLabelText("Elige un plan")).toBeOnTheScreen();
    });
    expect(
      screen.getByText("Registrando pago para: Lucía Fernández"),
    ).toBeOnTheScreen();
    await waitFor(() => {
      expect(
        screen.getByText("Este cliente tiene Bs 60 de crédito disponible."),
      ).toBeOnTheScreen();
    });
    expect(screen.getByText("Bs 500")).toBeOnTheScreen();
    expect(screen.getByText("Bs 720")).toBeOnTheScreen();

    await fireEvent.press(
      screen.getByRole("button", { name: "Paquete de 8 clases" }),
    );
    await waitFor(() => {
      expect(
        screen.getByLabelText("Confirmar pago en efectivo"),
      ).toBeOnTheScreen();
    });
    expect(screen.getByText("Precio del plan")).toBeOnTheScreen();
    expect(screen.getByText("Bs 560")).toBeOnTheScreen();
    expect(screen.getByText("Crédito aplicado")).toBeOnTheScreen();
    expect(screen.getByText("Bs 60")).toBeOnTheScreen();
    expect(screen.getByText("Monto a cobrar en efectivo")).toBeOnTheScreen();
    expect(screen.getByText("Bs 500")).toBeOnTheScreen();

    await fireEvent.press(
      screen.getByRole("button", { name: "Confirmar pago recibido" }),
    );
    await waitFor(() => {
      expect(screen.getByText("¡Pago registrado!")).toBeOnTheScreen();
    });
    expect(paid).toHaveBeenCalledWith({
      body: { planId: "plan-8", branchId: "branch-centro" },
      idempotencyKey: expect.stringMatching(/^[0-9a-f-]{36}$/),
    });
    expect(screen.getByText("Paquete de 8 clases")).toBeOnTheScreen();
    expect(screen.getByText("8 clases")).toBeOnTheScreen();
    expect(screen.getByText("Válido hasta el 22 de octubre de 2026")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Volver al cliente" }));
    await waitFor(() => {
      expect(screen.getByLabelText("Lucía Fernández")).toBeOnTheScreen();
    });
  });

  it("invites a new Client, shows the pending invitation on her overview, and cancels it", async () => {
    const invited = jest.fn();
    const cancelledInvitation = jest.fn();
    const screen = await openClientSearch({
      ...assistantRoutes(),
      "POST /api/v1/assistant/client-invitations": (init) => {
        invited(JSON.parse(String(init?.body)));
        return jsonResponse(
          { status: "invited", clientId: "client-new", email: "ana@example.com" },
          201,
        );
      },
      "/api/v1/assistant/clients/client-new": () =>
        jsonResponse({
          client: newClient,
          subscription: { status: "none", subscription: null },
          nextBooking: null,
          recentHistory: [],
          creditAvailableCentavos: 0,
        }),
      "/api/v1/assistant/client-invitations/client-new": () =>
        jsonResponse(invitation),
      "POST /api/v1/assistant/client-invitations/client-new/cancellation": () => {
        cancelledInvitation();
        return new Response(null, { status: 204 });
      },
    });

    await fireEvent.press(screen.getByRole("button", { name: "+ Nuevo cliente" }));
    await waitFor(() => {
      expect(screen.getByLabelText("Nuevo cliente")).toBeOnTheScreen();
    });
    expect(
      screen.getByText(
        "Enviaremos un enlace de activación al correo. Vence en 7 días.",
      ),
    ).toBeOnTheScreen();
    fireEvent.changeText(screen.getByLabelText("Nombre"), " Ana Nueva ");
    fireEvent.changeText(
      screen.getByLabelText("Correo electrónico"),
      "Ana@Example.com",
    );
    fireEvent.changeText(
      screen.getByLabelText("Teléfono (opcional)"),
      "+591 70000000",
    );
    await fireEvent.press(screen.getByRole("button", { name: "Crear cuenta" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Ana Nueva")).toBeOnTheScreen();
    });
    expect(invited).toHaveBeenCalledWith({
      name: "Ana Nueva",
      email: "Ana@Example.com",
      phone: "+591 70000000",
    });
    expect(screen.getByText("Sin plan activo")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Reservar clase" })).toBeDisabled();
    await waitFor(() => {
      expect(screen.getByText("Cuenta pendiente de activación")).toBeOnTheScreen();
    });
    expect(screen.getByText("ana@example.com")).toBeOnTheScreen();
    expect(
      screen.getByText("El enlace de activación vence el 29 de septiembre de 2026."),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        "La invitación se elimina a los 30 días sin activación, cambio de correo o reenvío.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Cambiar correo" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Reenviar enlace" })).toBeOnTheScreen();

    await fireEvent.press(
      screen.getByRole("button", { name: "Cancelar invitación" }),
    );
    await waitFor(() => {
      expect(
        screen.getByText("¿Cancelar la invitación de Ana Nueva?"),
      ).toBeOnTheScreen();
    });
    await fireEvent.press(
      screen.getByRole("button", { name: "Sí, cancelar invitación" }),
    );
    await waitFor(() => {
      expect(screen.getByLabelText("Buscar cliente")).toBeOnTheScreen();
    });
    expect(cancelledInvitation).toHaveBeenCalledTimes(1);
  });
});
