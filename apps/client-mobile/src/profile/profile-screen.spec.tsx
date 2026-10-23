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

  it("draws 18's line icon on every Perfil row (follow-up 70)", async () => {
    const screen = await openProfile();

    for (const row of [
      "plan",
      "evaluation",
      "evaluations",
      "referrals",
      "credit",
      "notifications",
      "password",
    ]) {
      expect(
        screen.getByTestId(`profile-row-icon-${row}`, { includeHiddenElements: true }),
      ).toBeOnTheScreen();
    }
  });

  // MOB-041: 18 ends every menu row in the 19 pt Icono tenue chevron.
  it("ends every Perfil row in the quiet chevron", async () => {
    const screen = await openProfile();

    // The Inicio tab is mounted too, so count the quiet ones only.
    const chevrons = screen
      .getAllByTestId("chevron", { includeHiddenElements: true })
      .filter((chevron) => chevron.props.stroke === "#C4BAB6");
    expect(chevrons).toHaveLength(7);
    for (const chevron of chevrons) {
      expect(chevron).toHaveProp("width", 19);
    }
    expect(screen.queryByText("›")).toBeNull();
  });

  it("shows the account summary and the Plan status row", async () => {
    const screen = await openProfile();

    expect(screen.getByText("sofia@example.com")).toBeOnTheScreen();
    expect(screen.getByText("+591 70011004")).toBeOnTheScreen();
    expect(screen.getByText("Vencida")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Mi plan: Vencida" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeOnTheScreen();
  });

  it("opens the expired Plan detail with a purchase action", async () => {
    const screen = await openProfile();

    await fireEvent.press(screen.getByRole("button", { name: "Mi plan: Vencida" }));

    await waitFor(() => {
      expect(screen.getByText("Último plan")).toBeOnTheScreen();
    });
    expect(screen.getByText("Vencida")).toBeOnTheScreen();
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

    // The row and the Perfil tab both carry the count (follow-up 73).
    await waitFor(() => {
      expect(screen.getByTestId("notifications-row-badge")).toHaveTextContent("2");
    });
    // MOB-070: the footer reads the installed app version, not a hard-coded 1.0.
    expect(screen.getByText("Emma Pilates Studio · versión 1.0.1")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Notificaciones" }));

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
            current = { ...profile, name: "Sofía Guzmán Vega", phone: null };
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
    await fireEvent.changeText(screen.getByLabelText("Teléfono"), "");
    await fireEvent.press(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => {
      expect(saved).toHaveBeenCalledWith({
        name: "Sofía Guzmán Vega",
        phone: null,
      });
      expect(screen.getByText("Sofía Guzmán Vega")).toBeOnTheScreen();
    });
    expect(screen.queryByText("Editar perfil")).not.toBeOnTheScreen();
  });
});
