import { cleanup, fireEvent, waitFor } from "@testing-library/react-native";
import { boliviaCivilDate, civilDateRange, clearMobileQueryCache } from "@pilates/mobile-core";

import { jsonResponse } from "../test-support";
import {
  expiredOverview,
  minute,
  soonBooking,
  session,
  newClient,
  invitation,
  assistantRoutes,
  openClientSearch,
  openLucia,
} from "./assistant-fixtures";

jest.setTimeout(20_000);

describe("Assistant Client flows", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("searches Clients and opens the overview with the Subscription, quick actions, and history preview", async () => {
    const screen = await openClientSearch(assistantRoutes());

    await fireEvent.changeText(
      screen.getByPlaceholderText("Buscar por nombre, teléfono o correo"),
      "zz",
    );
    await waitFor(() => {
      expect(screen.getByText("No se encontró ningún cliente.")).toBeOnTheScreen();
    });

    await fireEvent.changeText(
      screen.getByPlaceholderText("Buscar por nombre, teléfono o correo"),
      "luc",
    );
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Ver cliente Lucía Fernández" })).toBeOnTheScreen();
    });
    expect(screen.getByText("+591 70011001 · lucia@example.com")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Ver cliente Lucía Fernández" }));
    await waitFor(() => {
      expect(screen.getByLabelText("Lucía Fernández")).toBeOnTheScreen();
    });
    expect(screen.getByText("Paquete de 8 clases")).toBeOnTheScreen();
    expect(screen.getByText("5 clases restantes")).toBeOnTheScreen();
    expect(screen.getByText("Vence el 12 de octubre de 2026")).toBeOnTheScreen();
    expect(screen.getByText("Activa")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Reservar clase" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Registrar pago en efectivo" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Ver reservas" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Ver historial completo" })).toBeOnTheScreen();
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
    expect(screen.getByText("Viendo reservas de: Lucía Fernández")).toBeOnTheScreen();
    await waitFor(() => {
      expect(screen.getByText("No cancelable")).toBeOnTheScreen();
    });
    expect(screen.getByText("En lista de espera")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Reprogramar" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Salir de la lista de espera" })).toBeDisabled();
    expect(screen.getByText("Solo en tus sucursales")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Cancelar" }));
    await waitFor(() => {
      expect(screen.getByText("¿Cancelar esta reserva de Lucía Fernández?")).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: "Sí, cancelar reserva" }));
    await waitFor(() => {
      expect(cancelled).toHaveBeenCalledTimes(1);
    });

    await fireEvent.press(screen.getByRole("button", { name: "Volver" }));
    await waitFor(() => {
      expect(screen.getByLabelText("Lucía Fernández")).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: "Ver historial completo" }));
    await waitFor(() => {
      expect(screen.getByLabelText("Historial de clases")).toBeOnTheScreen();
    });
    expect(screen.getByText("Viendo historial de: Lucía Fernández")).toBeOnTheScreen();
    await waitFor(() => {
      expect(screen.getByText("Septiembre 2026")).toBeOnTheScreen();
    });
    expect(screen.getByText("Agosto 2026")).toBeOnTheScreen();
    expect(screen.getAllByText("Emma Vargas · Centro")).toHaveLength(3);
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
      expect(screen.getByRole("button", { name: /^Reformer Pilates \d/ })).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: /^Reformer Pilates \d/ }));
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

    await fireEvent.press(screen.getByRole("button", { name: "Volver" }));
    await waitFor(() => {
      expect(screen.getByLabelText("Lucía Fernández")).toBeOnTheScreen();
    });
    expect(screen.queryByText("Reservando para: Lucía Fernández")).toBeNull();
  });

  it("reschedules a Booking inside the cancellation window and goes back to the overview from her Bookings", async () => {
    const rescheduled = jest.fn();
    const alternativeStart = new Date(new Date(soonBooking.startsAt).getTime() + minute);
    const { from: dayFrom, until: dayUntil } = civilDateRange(boliviaCivilDate(alternativeStart));
    const alternative = {
      ...session,
      id: "session-alt",
      startsAt: alternativeStart.toISOString(),
      endsAt: new Date(alternativeStart.getTime() + 50 * minute).toISOString(),
    };
    const screen = await openLucia({
      ...assistantRoutes(),
      [`/api/v1/sessions?branchId=branch-centro&from=${encodeURIComponent(dayFrom)}&until=${encodeURIComponent(dayUntil)}&limit=100`]:
        () => jsonResponse([alternative]),
      "POST /api/v1/bookings/booking-soon/reschedule": (init) => {
        rescheduled(JSON.parse(String(init?.body)));
        return jsonResponse({ id: "booking-moved" });
      },
    });

    await fireEvent.press(screen.getByRole("button", { name: "Ver reservas" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Reprogramar" })).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: "Reprogramar" }));
    await waitFor(() => {
      expect(screen.getByLabelText("Reprogramar clase")).toBeOnTheScreen();
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Reformer Pilates \d/ })).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: /^Reformer Pilates \d/ }));
    await fireEvent.press(screen.getByRole("button", { name: "Confirmar cambio" }));
    await waitFor(() => {
      expect(rescheduled).toHaveBeenCalledWith({ targetSessionId: "session-alt" });
    });
    await waitFor(() => {
      expect(screen.getByLabelText("Reservas de la clienta")).toBeOnTheScreen();
    });

    await fireEvent.press(screen.getByRole("button", { name: "Volver" }));
    await waitFor(() => {
      expect(screen.getByLabelText("Lucía Fernández")).toBeOnTheScreen();
    });
    expect(screen.queryByLabelText("Reprogramar clase")).toBeNull();
  });

  it("records a cash Payment for the Plan's full price, never Credit, and returns to the overview (PAY-005)", async () => {
    const paid = jest.fn();
    const screen = await openLucia({
      ...assistantRoutes(),
      "/api/v1/assistant/clients/client-lucia": () => jsonResponse(expiredOverview),
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
              creditAppliedCentavos: 0,
              amountDueCentavos: 56_000,
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

    await fireEvent.press(screen.getByRole("button", { name: "Registrar pago en efectivo" }));
    await waitFor(() => {
      expect(screen.getByLabelText("Elige un plan")).toBeOnTheScreen();
    });
    expect(screen.getByText("Registrando pago para: Lucía Fernández")).toBeOnTheScreen();
    // The quotes may still carry an older Credit figure; the screen ignores it.
    await waitFor(() => {
      expect(screen.getByText("Bs 560")).toBeOnTheScreen();
    });
    expect(screen.getByText("Bs 780")).toBeOnTheScreen();
    expect(screen.queryByText(/crédito/)).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: "Paquete de 8 clases" }));
    await waitFor(() => {
      expect(screen.getByLabelText("Confirmar pago en efectivo")).toBeOnTheScreen();
    });
    expect(screen.getByText("Precio del plan")).toBeOnTheScreen();
    expect(screen.queryByText("Crédito aplicado")).toBeNull();
    expect(screen.getByText("Monto a cobrar en efectivo")).toBeOnTheScreen();
    expect(screen.getAllByText("Bs 560")).toHaveLength(2);

    await fireEvent.press(screen.getByRole("button", { name: "Confirmar pago recibido" }));
    await waitFor(() => {
      expect(screen.getByText("¡Pago registrado!")).toBeOnTheScreen();
    });
    expect(paid).toHaveBeenCalledWith({
      body: { planId: "plan-8", branchId: "branch-centro", invoiceData: null },
      idempotencyKey: expect.stringMatching(/^[0-9a-f-]{36}$/),
    });
    expect(screen.getByText("Paquete de 8 clases")).toBeOnTheScreen();
    expect(screen.getByText("8 clases")).toBeOnTheScreen();
    expect(screen.getByText("Válido hasta el 22 de octubre de 2026")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Volver al cliente" }));
    await waitFor(() => {
      expect(screen.getByLabelText("Lucía Fernández")).toBeOnTheScreen();
    });

    await fireEvent.press(screen.getByRole("button", { name: "Volver" }));
    await waitFor(() => {
      expect(screen.getByLabelText("Buscar cliente")).toBeOnTheScreen();
    });
    expect(screen.queryByText("¡Pago registrado!")).toBeNull();
  });

  it("goes back from a newly invited Client's overview to the search, not the form", async () => {
    const screen = await openClientSearch({
      ...assistantRoutes(),
      "POST /api/v1/assistant/client-invitations": () =>
        jsonResponse({ status: "invited", clientId: "client-new", email: "ana@example.com" }, 201),
      "/api/v1/assistant/clients/client-new": () =>
        jsonResponse({
          client: newClient,
          subscription: { status: "none", subscription: null },
          nextBooking: null,
          recentHistory: [],
          creditAvailableCentavos: 0,
        }),
      "/api/v1/assistant/client-invitations/client-new": () => jsonResponse(invitation),
    });

    await fireEvent.press(screen.getByRole("button", { name: "+ Nuevo cliente" }));
    await waitFor(() => {
      expect(screen.getByLabelText("Nuevo cliente")).toBeOnTheScreen();
    });
    await fireEvent.changeText(screen.getByLabelText("Nombre"), "Ana Nueva");
    await fireEvent.changeText(screen.getByLabelText("Correo electrónico"), "ana@example.com");
    await fireEvent.press(screen.getByRole("button", { name: "Crear cuenta" }));
    await waitFor(() => {
      expect(screen.getByLabelText("Ana Nueva")).toBeOnTheScreen();
    });

    await fireEvent.press(screen.getByRole("button", { name: "Volver" }));
    await waitFor(() => {
      expect(screen.getByLabelText("Buscar cliente")).toBeOnTheScreen();
    });
    expect(screen.queryByRole("button", { name: "Crear cuenta" })).toBeNull();
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
      "/api/v1/assistant/client-invitations/client-new": () => jsonResponse(invitation),
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
      screen.getByText("Enviaremos un enlace de activación al correo. Vence en 7 días."),
    ).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText("Nombre"), " Ana Nueva ");
    await fireEvent.changeText(screen.getByLabelText("Correo electrónico"), "Ana@Example.com");
    await fireEvent.changeText(screen.getByLabelText("Teléfono (opcional)"), "+591 70000000");
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

    await fireEvent.press(screen.getByRole("button", { name: "Cancelar invitación" }));
    await waitFor(() => {
      expect(screen.getByText("¿Cancelar la invitación de Ana Nueva?")).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: "Sí, cancelar invitación" }));
    await waitFor(() => {
      expect(screen.getByLabelText("Buscar cliente")).toBeOnTheScreen();
    });
    expect(cancelledInvitation).toHaveBeenCalledTimes(1);
  });
});
