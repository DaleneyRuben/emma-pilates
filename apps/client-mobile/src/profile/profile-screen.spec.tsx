import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";
import { openProfile, profile, readRoutes } from "./profile-test-support";

jest.setTimeout(20_000);

const notificationRoutes = {
  "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 2 }),
  "/api/v1/notifications?limit=50": () =>
    jsonResponse({
      items: [
        {
          id: "n1",
          category: "booking_schedule",
          type: "session_cancelled",
          title: "Clase cancelada",
          message: "Tu clase de Reformer Pilates fue cancelada.",
          destinationType: "session",
          destinationId: "session-1",
          createdAt: new Date(Date.now() - 40 * 60_000).toISOString(),
          readAt: null,
        },
        {
          id: "n2",
          category: "subscription_payment",
          type: "subscription_expiring",
          title: "Tu plan vence pronto",
          message: "Tu plan vence en 3 días.",
          destinationType: "subscription",
          destinationId: "subscription-1",
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60_000).toISOString(),
          readAt: new Date(Date.now() - 2 * 24 * 60 * 60_000).toISOString(),
        },
      ],
      hasMore: false,
      nextCursor: null,
    }),
};

// Holds the profile request until `release` runs, so Perfil mounts while the
// profile query is still pending (a cold cache), as it never is through Inicio
// against a local API.
function gatedProfileFetcher() {
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const fetcher = routeFetcher(readRoutes);
  const gated = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const method = init?.method?.toUpperCase() ?? "GET";
    if (method === "GET" && String(input).endsWith("/api/v1/clients/current")) {
      await gate;
    }
    return fetcher(input, init);
  }) as unknown as typeof globalThis.fetch;
  return { fetcher: gated, release: () => release() };
}

async function openPerfilTab(runtime: ReturnType<typeof createClientRuntime>) {
  const screen = await render(<App runtime={runtime} />);
  await waitFor(
    () => {
      expect(screen.getByRole("button", { name: /Perfil/ })).toBeOnTheScreen();
    },
    { timeout: 10_000 },
  );
  await fireEvent.press(screen.getByRole("button", { name: /Perfil/ }));
  return screen;
}

describe("Client Profile", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  // MOB-051: the hook count must not change when the profile query settles.
  it("shows the profile once a pending profile request answers", async () => {
    const { fetcher, release } = gatedProfileFetcher();
    const screen = await openPerfilTab(createClientRuntime(fetcher));

    await waitFor(() => {
      expect(screen.getByLabelText("Cargando perfil")).toBeOnTheScreen();
    });

    release();

    await waitFor(() => {
      expect(screen.getByText("Sofía Guzmán")).toBeOnTheScreen();
    });
    expect(screen.getByText("sofia@example.com")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeOnTheScreen();
  });

  it("recovers from a failed profile request when Reintentar succeeds", async () => {
    // Inicio and Perfil both mount the profile query, so it keeps failing until
    // the spec lets Reintentar succeed; a single failure could be overtaken by
    // the second mount's refetch.
    let failing = true;
    const screen = await openPerfilTab(
      createClientRuntime(
        routeFetcher({
          ...readRoutes,
          "/api/v1/clients/current": () =>
            failing
              ? jsonResponse({ code: "internal_error", status: 500 }, 500)
              : jsonResponse(profile),
        }),
      ),
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Reintentar" })).toBeOnTheScreen();
    });
    expect(screen.getByText("No pudimos cargar tu perfil.")).toBeOnTheScreen();

    failing = false;
    await fireEvent.press(screen.getByRole("button", { name: "Reintentar" }));

    await waitFor(() => {
      expect(screen.getByText("Sofía Guzmán")).toBeOnTheScreen();
    });
    expect(screen.queryByText("No pudimos cargar tu perfil.")).not.toBeOnTheScreen();
  });

  // Follow-up 227 (C18): the rows are v2 icon rows in three sections, and
  // «Cerrar sesión» is the last row of «Cuenta» (walkthrough n.º 19).
  it("groups the rows under Tu plan y tus clases, Preferencias and Cuenta", async () => {
    const screen = await openProfile();

    for (const title of ["Tu plan y tus clases", "Preferencias", "Cuenta"]) {
      expect(screen.getByRole("header", { name: title })).toBeOnTheScreen();
    }
    for (const row of [
      "Evaluación nutricional",
      "Mis evaluaciones",
      "Invita a una amiga",
      "Notificaciones",
      "Cambiar contraseña",
      "Enviar comentarios",
      "Cerrar sesión",
    ]) {
      expect(screen.getByRole("button", { name: row })).toBeOnTheScreen();
    }
    expect(screen.getAllByTestId("icon-row-disc").length).toBeGreaterThanOrEqual(8);
    expect(
      screen.getByText("Usamos tu nombre, correo y teléfono para enviarte ofertas del estudio."),
    ).toBeOnTheScreen();
    // Follow-up 256 § 2 (verification n.º 43, 44): «Cerrar sesión» is the Error
    // last row, as in the Staff app, and «Cerrar mi cuenta» a muted link after
    // the version, far from it.
    expect(screen.getByText("Cerrar sesión")).toHaveStyle({ color: "#A04E3E" });
    expect(screen.getByText("Cerrar mi cuenta")).toHaveStyle({
      color: "#6F6662",
      textDecorationLine: "underline",
    });
    expect(screen.getByText(/^Emma Pilates Studio · versión .+ ·$/)).toBeOnTheScreen();
    // PAY-005 retired Credit: Perfil has no «Mi crédito» row.
    expect(screen.queryByRole("button", { name: /Mi crédito/ })).toBeNull();
  });

  it("shows the account summary and the Plan status row", async () => {
    const screen = await openProfile();

    expect(screen.getByText("sofia@example.com")).toBeOnTheScreen();
    expect(screen.getByText("🇧🇴 +591 70011004")).toBeOnTheScreen();
    expect(screen.getByText("Vencido")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Mi plan, Vencido" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeOnTheScreen();
  });

  it("opens the expired Plan detail with a purchase action", async () => {
    const screen = await openProfile();

    await fireEvent.press(screen.getByRole("button", { name: "Mi plan, Vencido" }));

    await waitFor(() => {
      expect(screen.getByText(/^Último plan · /)).toBeOnTheScreen();
    });
    expect(screen.getByText("Vencido")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Comprar un plan" })).toBeOnTheScreen();
  });

  it("asks for confirmation in the sheet before logging out", async () => {
    const runtime = createClientRuntime(routeFetcher(readRoutes));
    const screen = await openProfile(runtime);

    await fireEvent.press(screen.getByRole("button", { name: "Cerrar sesión" }));

    // UX-002: the design's sheet, not a native alert.
    const sheet = within(screen.getByTestId("logout-sheet"));
    expect(sheet.getByText("¿Cerrar sesión?")).toBeOnTheScreen();
    await fireEvent.press(sheet.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByTestId("logout-sheet")).toBeNull();
    expect(runtime.sessionManager.logout).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole("button", { name: "Cerrar sesión" }));
    await fireEvent.press(screen.getByTestId("logout-confirm"));

    await waitFor(() => {
      expect(runtime.sessionManager.logout).toHaveBeenCalled();
    });
  });

  it("shows the unread count on the Notificaciones row and opens the inbox", async () => {
    const screen = await openProfile(
      createClientRuntime(routeFetcher({ ...readRoutes, ...notificationRoutes })),
    );

    // C18: the row says the count as its value; the pill is on the Inicio bell.
    await waitFor(() => {
      expect(screen.getByText("2 sin leer")).toBeOnTheScreen();
    });
    // MOB-070: the footer reads the installed app version, not a hard-coded 1.0.
    expect(screen.getByText("Emma Pilates Studio · versión 1.0.1")).toBeOnTheScreen();

    await fireEvent.press(
      screen.getByRole("button", {
        name: "Notificaciones, 2 sin leer",
      }),
    );

    await waitFor(() => {
      expect(screen.getByText("Sin leer")).toBeOnTheScreen();
    });
    expect(screen.getByText("Tu clase de Reformer Pilates fue cancelada.")).toBeOnTheScreen();
    expect(screen.getByText("Tu plan vence en 3 días.")).toBeOnTheScreen();
  });

  it("opens the change password step from Perfil", async () => {
    const screen = await openProfile();

    await fireEvent.press(screen.getByRole("button", { name: "Cambiar contraseña" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Contraseña actual")).toBeOnTheScreen();
    });
    expect(screen.getByRole("button", { name: "Guardar contraseña" })).toBeOnTheScreen();
  });

  it("opens «Enviar comentarios» from Perfil (REL-012)", async () => {
    const screen = await openProfile();

    await fireEvent.press(screen.getByRole("button", { name: "Enviar comentarios" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Comentario")).toBeOnTheScreen();
    });
    expect(screen.getByRole("button", { name: "Enviar comentario" })).toBeDisabled();
  });

  it("edits the name and phone and saves them through the API", async () => {
    const saved = jest.fn();
    // Perfil refetches when it regains focus (UX-004), so the read answers
    // with the saved profile once the PATCH has landed, as the API does.
    let current: { name: string; phone: string | null } = profile;
    const screen = await openProfile(
      createClientRuntime(
        routeFetcher({
          ...readRoutes,
          "/api/v1/clients/current": () => jsonResponse(current),
          "PATCH /api/v1/clients/current": (init) => {
            saved(JSON.parse(String(init?.body)));
            current = { ...profile, name: "Sofía Guzmán Vega", phone: "+51 912345678" };
            return jsonResponse(current);
          },
        }),
      ),
    );

    await fireEvent.press(screen.getByRole("button", { name: "Editar" }));
    await waitFor(() => {
      expect(screen.getByText("Editar perfil")).toBeOnTheScreen();
    });
    expect(screen.getByLabelText("Nombre")).toHaveProp("value", "Sofía Guzmán");
    // The email is editable since IDN-008; unchanged, it sends no request.
    expect(screen.getByLabelText("Correo electrónico")).toHaveProp("value", "sofia@example.com");

    await fireEvent.changeText(screen.getByLabelText("Nombre"), "Sofía Guzmán Vega");
    // FIX-037: the mobile is required here too, with its country.
    await fireEvent.changeText(screen.getByLabelText("Celular"), "");
    await fireEvent.press(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(
      screen.getByRole("alert", {
        name: "Escribe tu celular. Lo necesitamos para escribirte por WhatsApp.",
      }),
    ).toBeOnTheScreen();
    expect(saved).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole("button", { name: "País: Bolivia, +591" }));
    await fireEvent.press(screen.getAllByRole("button", { name: "Perú, +51" })[0]);
    await fireEvent.changeText(screen.getByLabelText("Celular"), "912 345 678");
    await fireEvent.press(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => {
      expect(saved).toHaveBeenCalledWith({
        name: "Sofía Guzmán Vega",
        phone: "+51 912345678",
      });
      expect(screen.getByText("Sofía Guzmán Vega")).toBeOnTheScreen();
    });
    expect(screen.queryByText("Editar perfil")).not.toBeOnTheScreen();
  });
});
