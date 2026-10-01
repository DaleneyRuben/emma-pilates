import { cleanup, fireEvent, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { jsonResponse } from "../test-support";
import {
  assistantRoutes,
  invitation,
  newClient,
  openClientSearch,
} from "./assistant-fixtures";

jest.setTimeout(20_000);

const limited = (code: string, retryAfter: number) =>
  new Response(JSON.stringify({ code, status: 429 }), {
    headers: {
      "Content-Type": "application/problem+json",
      "Retry-After": String(retryAfter),
    },
    status: 429,
  });

const overviewRoutes = (pending = invitation) => ({
  "/api/v1/assistant/clients/client-new": () =>
    jsonResponse({
      client: newClient,
      subscription: { status: "none", subscription: null },
      nextBooking: null,
      recentHistory: [],
      creditAvailableCentavos: 0,
    }),
  "/api/v1/assistant/client-invitations/client-new": () => jsonResponse(pending),
});

async function submitNewClient(screen: Awaited<ReturnType<typeof openClientSearch>>) {
  await fireEvent.press(screen.getByRole("button", { name: "+ Nuevo cliente" }));
  await waitFor(() => {
    expect(screen.getByLabelText("Nuevo cliente")).toBeOnTheScreen();
  });
  await fireEvent.changeText(screen.getByLabelText("Nombre"), "Ana Nueva");
  await fireEvent.changeText(
    screen.getByLabelText("Correo electrónico"),
    "ana@example.com",
  );
  await fireEvent.press(screen.getByRole("button", { name: "Crear cuenta" }));
}

describe("Assistant invitations (S05, S06)", () => {
  afterEach(() => {
    cleanup();
    clearMobileQueryCache();
  });

  it("offers a self-registered Client a new verification link instead of sending one", async () => {
    const sent = jest.fn();
    const screen = await openClientSearch({
      ...assistantRoutes(),
      ...overviewRoutes(),
      "POST /api/v1/assistant/client-invitations": () =>
        jsonResponse(
          {
            status: "verification_pending",
            clientId: "client-new",
            email: "ana@example.com",
          },
          201,
        ),
      "POST /api/v1/assistant/client-invitations/client-new/verification-emails":
        () => {
          sent();
          return jsonResponse({ clientId: "client-new", email: "ana@example.com" }, 202);
        },
    });

    await submitNewClient(screen);

    expect(
      await screen.findByText(
        "Este correo ya se registró desde la app y espera verificación. No cambiamos sus datos ni su contraseña.",
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        "Puedes enviarle un enlace de verificación nuevo, válido por 24 horas. Los anteriores dejan de funcionar.",
      ),
    ).toBeOnTheScreen();
    expect(sent).not.toHaveBeenCalled();

    await fireEvent.press(
      screen.getByRole("button", { name: "Enviar enlace de verificación" }),
    );

    expect(
      await screen.findByText("Enviamos un enlace de verificación nuevo."),
    ).toBeOnTheScreen();
    expect(sent).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByRole("button", { name: "Ver cliente" }));
    expect(await screen.findByLabelText("Ana Nueva")).toBeOnTheScreen();
  });

  it("says when a limited verification link can be sent again", async () => {
    const screen = await openClientSearch({
      ...assistantRoutes(),
      "POST /api/v1/assistant/client-invitations": () =>
        jsonResponse(
          {
            status: "verification_pending",
            clientId: "client-new",
            email: "ana@example.com",
          },
          201,
        ),
      "POST /api/v1/assistant/client-invitations/client-new/verification-emails":
        () => limited("email_throttled", 40),
    });

    await submitNewClient(screen);
    await fireEvent.press(
      await screen.findByRole("button", { name: "Enviar enlace de verificación" }),
    );

    expect(
      await screen.findByText(
        "Ya enviamos un correo a esa dirección hace poco. El enlace vigente sigue sirviendo.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText("Podrás reenviarlo en 0:40.")).toBeOnTheScreen();
  });

  it("says nothing changed when the email belongs to another account", async () => {
    const screen = await openClientSearch({
      ...assistantRoutes(),
      "POST /api/v1/assistant/client-invitations": () =>
        jsonResponse({ code: "email_in_use", status: 409 }, 409),
    });

    await submitNewClient(screen);

    expect(
      await screen.findByRole("alert", {
        name: "Este correo ya pertenece a otra cuenta. No se creó ni se cambió nada.",
      }),
    ).toBeOnTheScreen();
  });

  it("tells the Assistant when the same email reopened a pending invitation", async () => {
    const screen = await openClientSearch({
      ...assistantRoutes(),
      ...overviewRoutes(),
      "POST /api/v1/assistant/client-invitations": () =>
        jsonResponse(
          { status: "invitation_resent", clientId: "client-new", email: "ana@example.com" },
          201,
        ),
    });

    await submitNewClient(screen);

    expect(
      await screen.findByText(
        "Ana ya estaba pendiente de activación. Le enviamos un enlace nuevo y conservamos sus datos.",
      ),
    ).toBeOnTheScreen();
  });

  it("shows the server wait on a limited resend", async () => {
    const screen = await openClientSearch({
      ...assistantRoutes(),
      ...overviewRoutes(),
      "POST /api/v1/assistant/client-invitations": () =>
        jsonResponse(
          { status: "invited", clientId: "client-new", email: "ana@example.com" },
          201,
        ),
      "POST /api/v1/assistant/client-invitations/client-new/resends": () =>
        limited("email_throttled", 40),
    });

    await submitNewClient(screen);
    await fireEvent.press(await screen.findByRole("button", { name: "Reenviar enlace" }));

    expect(
      await screen.findByText(
        "Ya enviamos un correo a esa dirección hace poco. El enlace vigente sigue sirviendo.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText("Podrás reenviarlo en 0:40.")).toBeOnTheScreen();
  });

  it("explains why an invitation with Payments or Bookings cannot be cancelled", async () => {
    const screen = await openClientSearch({
      ...assistantRoutes(),
      ...overviewRoutes({ ...invitation, cancellable: false }),
      "POST /api/v1/assistant/client-invitations": () =>
        jsonResponse(
          { status: "invited", clientId: "client-new", email: "ana@example.com" },
          201,
        ),
    });

    await submitNewClient(screen);

    expect(
      await screen.findByText(
        "La cuenta ya tiene pagos o reservas, así que la invitación se mantiene.",
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByRole("button", { name: "Cancelar invitación" }),
    ).not.toBeOnTheScreen();
  });

  it("words a failed email change apart from an invalid address", async () => {
    const screen = await openClientSearch({
      ...assistantRoutes(),
      ...overviewRoutes(),
      "POST /api/v1/assistant/client-invitations": () =>
        jsonResponse(
          { status: "invited", clientId: "client-new", email: "ana@example.com" },
          201,
        ),
      "POST /api/v1/assistant/client-invitations/client-new/email-corrections": () =>
        jsonResponse({ code: "unexpected_error", status: 500 }, 500),
    });

    await submitNewClient(screen);
    await fireEvent.press(await screen.findByRole("button", { name: "Cambiar correo" }));
    await fireEvent.changeText(
      screen.getByLabelText("Nuevo correo"),
      "ana.nueva@example.com",
    );
    await fireEvent.press(screen.getByRole("button", { name: "Guardar correo" }));

    expect(
      await screen.findByText("No pudimos cambiar el correo. Inténtalo de nuevo."),
    ).toBeOnTheScreen();
  });
});
