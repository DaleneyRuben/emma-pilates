import { cleanup, fireEvent, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";
import { openProfile, readRoutes } from "./profile-test-support";

jest.setTimeout(20_000);

const active = {
  status: "active",
  subscription: {
    id: "subscription-1",
    planName: "Mensual 16 clases",
    originalClassAllowance: 16,
    remainingClassAllowance: 11,
    startsOn: "2026-09-01",
    endsOn: "2026-09-30",
  },
};

const booking = (kind: "booking" | "waitlist", id: string) => ({
  kind,
  ...(kind === "booking" ? { bookingId: id } : { waitlistEntryId: id }),
  sessionId: `session-${id}`,
  branchId: "branch-1",
  classTypeName: "Reformer Pilates",
  trainerName: "Emma Vargas",
  branchName: "Centro",
  startsAt: "2030-10-01T13:00:00.000Z",
  endsAt: "2030-10-01T14:00:00.000Z",
});

const evaluation = {
  id: "evaluation-1",
  slotId: "slot-1",
  state: "booked",
  startsAt: "2030-10-02T13:00:00.000Z",
  endsAt: "2030-10-02T13:45:00.000Z",
  durationMinutes: 45,
  branchId: "branch-1",
  branchName: "Centro",
  nutritionistName: "Gabriela Flores",
  cancellableUntil: "2030-10-02T10:00:00.000Z",
  cancellable: true,
};

const payment = (state: "pending" | "confirmed") => ({
  id: "payment-1",
  method: "transfer",
  state,
  planId: "plan-1",
  planName: "Mensual 16 clases",
  durationMonths: 1,
  classAllowance: 16,
  planPriceCentavos: 105_000,
  creditAppliedCentavos: 0,
  amountDueCentavos: 105_000,
  submittedAt: "2026-09-01T12:00:00.000Z",
});

const closureRoutes = (overrides: Record<string, (init?: RequestInit) => Response> = {}) => ({
  ...readRoutes,
  "/api/v1/clients/current/subscription": () => jsonResponse(active),
  "/api/v1/clients/current/credit": () =>
    jsonResponse({ availableCentavos: 12_000, reservedCentavos: 0, activity: [] }),
  "/api/v1/bookings": () =>
    jsonResponse([booking("booking", "b1"), booking("booking", "b2"), booking("waitlist", "w1")]),
  "/api/v1/evaluations?scope=upcoming": () =>
    jsonResponse({ items: [evaluation], hasMore: false, nextCursor: null }),
  "/api/v1/payments/current": () => jsonResponse(payment("confirmed")),
  ...overrides,
});

async function openClosure(routes = closureRoutes()) {
  const runtime = createClientRuntime(routeFetcher(routes));
  const screen = await openProfile(runtime);

  await fireEvent.press(screen.getByRole("button", { name: "Cerrar mi cuenta" }));
  await waitFor(() => {
    expect(
      screen.getByText(
        "Al cerrar tu cuenta dejas de usar Emma Pilates Studio. Esto es lo que va a pasar:",
      ),
    ).toBeOnTheScreen();
  });

  return { runtime, screen };
}

describe("Cerrar mi cuenta", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("lists what closing does and waits for the password", async () => {
    const { screen } = await openClosure();

    for (const line of [
      "Cancelamos tus 2 reservas futuras y tu evaluación nutricional pendiente. No se descuenta nada.",
      "Sales de 1 lista de espera.",
      "Tu plan Mensual 16 clases termina hoy. No se devuelve dinero y pierdes las 11 clases que te quedan.",
      "Pierdes tu crédito de Bs 120.",
      "Cerramos tu sesión en todos tus dispositivos.",
      "Tu correo queda libre por si quieres registrarte de nuevo.",
    ]) {
      expect(screen.getByText(line)).toBeOnTheScreen();
    }
    expect(screen.getByRole("button", { name: "Cerrar mi cuenta" })).toBeDisabled();

    await fireEvent.changeText(screen.getByLabelText("Contraseña"), "secret");

    expect(screen.getByRole("button", { name: "Cerrar mi cuenta" })).toBeEnabled();
  });

  it("closes the Account, forgets the session, and shows the notice on the login screen", async () => {
    const closure = jest.fn(() =>
      jsonResponse({
        closedWaitlistEntries: 1,
        cancelledBookings: 2,
        cancelledEvaluations: 1,
        forfeitedClasses: 11,
        forfeitedCreditCentavos: 12_000,
      }),
    );
    const { runtime, screen } = await openClosure(
      closureRoutes({ "POST /api/v1/accounts/current/closure": closure }),
    );

    await fireEvent.changeText(screen.getByLabelText("Contraseña"), "secret");
    await fireEvent.press(screen.getByRole("button", { name: "Cerrar mi cuenta" }));

    await waitFor(() => {
      expect(
        screen.getByText("Cerramos tu cuenta. Gracias por entrenar con nosotras."),
      ).toBeOnTheScreen();
    });
    expect(closure).toHaveBeenCalledTimes(1);
    const init = (closure.mock.calls[0] as unknown as [RequestInit])[0];
    expect(JSON.parse(String(init.body))).toEqual({ password: "secret" });
    expect(runtime.sessionManager.endLocally).toHaveBeenCalledWith({
      accountId: "account-1",
      role: "client",
    });
    expect(runtime.sessionManager.logout).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Iniciar sesión" })).toBeOnTheScreen();
  });

  it("shows a wrong password under the field and keeps the screen", async () => {
    const { screen } = await openClosure(
      closureRoutes({
        "POST /api/v1/accounts/current/closure": () =>
          jsonResponse({ code: "current_password_incorrect", status: 400 }, 400),
      }),
    );

    await fireEvent.changeText(screen.getByLabelText("Contraseña"), "wrong");
    await fireEvent.press(screen.getByRole("button", { name: "Cerrar mi cuenta" }));

    await waitFor(() => {
      expect(screen.getByText("La contraseña no es correcta.")).toBeOnTheScreen();
    });
    expect(screen.getByRole("button", { name: "Cerrar mi cuenta" })).toBeEnabled();
  });

  it("explains a network failure and keeps the password", async () => {
    const { screen } = await openClosure(
      closureRoutes({
        "POST /api/v1/accounts/current/closure": () =>
          jsonResponse({ code: "internal_error", status: 500 }, 500),
      }),
    );

    await fireEvent.changeText(screen.getByLabelText("Contraseña"), "secret");
    await fireEvent.press(screen.getByRole("button", { name: "Cerrar mi cuenta" }));

    await waitFor(() => {
      expect(
        screen.getByText("No pudimos cerrar tu cuenta. Inténtalo de nuevo."),
      ).toBeOnTheScreen();
    });
    expect(screen.getByLabelText("Contraseña").props.value).toBe("secret");
  });

  it("does not offer closure while a transfer awaits review", async () => {
    const runtime = createClientRuntime(
      routeFetcher(
        closureRoutes({
          "/api/v1/payments/current": () => jsonResponse(payment("pending")),
        }),
      ),
    );
    const screen = await openProfile(runtime);

    await fireEvent.press(screen.getByRole("button", { name: "Cerrar mi cuenta" }));

    await waitFor(() => {
      expect(
        screen.getByText(
          "Tienes un pago por transferencia en revisión. Podrás cerrar tu cuenta cuando el estudio lo confirme o lo rechace.",
        ),
      ).toBeOnTheScreen();
    });
    expect(screen.queryByLabelText("Contraseña")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Volver al perfil" }));
    await waitFor(() => {
      expect(screen.getByText("Sofía Guzmán")).toBeOnTheScreen();
    });
  });
});
