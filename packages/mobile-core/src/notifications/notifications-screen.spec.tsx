import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";

import { clearMobileQueryCache, MobileQueryProvider } from "../query/provider";
import { NotificationsScreen } from "./notifications-screen";
import { PushNotificationsContext } from "./push-notifications";

const now = () => new Date("2026-09-22T15:00:00.000Z");

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

function notification(id: string, message: string, createdAt: string, readAt: string | null) {
  return {
    id,
    category: "booking_schedule",
    type: "session_cancelled",
    title: "Aviso",
    message,
    destinationType: "session",
    destinationId: `session-${id}`,
    createdAt,
    readAt,
  };
}

const items = [
  notification(
    "n1",
    "Tu clase de Reformer Pilates fue cancelada.",
    "2026-09-22T14:20:00.000Z",
    null,
  ),
  notification(
    "n2",
    "¡Tienes un cupo! Te promovimos de la lista de espera.",
    "2026-09-22T13:00:00.000Z",
    null,
  ),
  notification(
    "n3",
    "Tu plan vence en 3 días.",
    "2026-09-21T22:05:00.000Z",
    "2026-09-21T23:00:00.000Z",
  ),
  notification(
    "n4",
    "Recordatorio: tu evaluación nutricional es mañana.",
    "2026-09-20T12:00:00.000Z",
    "2026-09-20T13:00:00.000Z",
  ),
];

function createFetcher(pages: unknown[]) {
  let listCalls = 0;
  return jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const path = typeof input === "string" ? input : input.toString();
    const method = init?.method?.toUpperCase() ?? "GET";
    if (method === "GET" && path.startsWith("/api/v1/notifications")) {
      const page = pages[Math.min(listCalls, pages.length - 1)];
      listCalls += 1;
      return Promise.resolve(jsonResponse(page));
    }
    if (method === "POST" && path === "/api/v1/notifications/read-all") {
      return Promise.resolve(jsonResponse({ marked: 2 }));
    }
    if (method === "POST" && /\/read$/.test(path)) {
      return Promise.resolve(jsonResponse({ marked: 1 }));
    }
    return Promise.resolve(jsonResponse({ code: "not_found" }, 404));
  }) as unknown as jest.Mock & typeof globalThis.fetch;
}

async function renderScreen(fetcher: typeof globalThis.fetch, onOpen = jest.fn()) {
  const screen = await render(
    <MobileQueryProvider>
      <NotificationsScreen
        emptySupport="Aquí te avisaremos sobre tus clases, pagos y evaluaciones."
        fetcher={fetcher}
        now={now}
        onBack={jest.fn()}
        onOpen={onOpen}
      />
    </MobileQueryProvider>,
  );
  return screen;
}

describe("NotificationsScreen", () => {
  afterEach(() => {
    cleanup();
    clearMobileQueryCache();
  });

  it("groups unread and earlier notifications with relative times", async () => {
    const screen = await renderScreen(createFetcher([{ items, hasMore: false, nextCursor: null }]));

    await waitFor(() => {
      expect(screen.getByText("Sin leer")).toBeOnTheScreen();
    });
    expect(screen.getByText("Anteriores")).toBeOnTheScreen();
    expect(screen.getByText("Hace 40 minutos")).toBeOnTheScreen();
    expect(screen.getByText("Hace 2 horas")).toBeOnTheScreen();
    expect(screen.getByText("Ayer, 18:05")).toBeOnTheScreen();
    expect(screen.getByText("Hace 2 días")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Marcar leídas" })).toBeOnTheScreen();
  });

  it("marks a notification read when opened and reports its destination", async () => {
    const fetcher = createFetcher([{ items, hasMore: false, nextCursor: null }]);
    const onOpen = jest.fn();
    const screen = await renderScreen(fetcher, onOpen);

    await waitFor(() => {
      expect(screen.getByText("Tu clase de Reformer Pilates fue cancelada.")).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByText("Tu clase de Reformer Pilates fue cancelada."));

    await waitFor(() => {
      expect(fetcher).toHaveBeenCalledWith(
        "/api/v1/notifications/n1/read",
        expect.objectContaining({ method: "POST" }),
      );
    });
    expect(onOpen).toHaveBeenCalledWith(
      expect.objectContaining({ id: "n1", destinationType: "session" }),
    );
  });

  it("marks every notification read and hides the action once nothing is unread", async () => {
    const readItems = items.map((item) => ({
      ...item,
      readAt: item.readAt ?? "2026-09-22T15:00:00.000Z",
    }));
    const fetcher = createFetcher([
      { items, hasMore: false, nextCursor: null },
      { items: readItems, hasMore: false, nextCursor: null },
    ]);
    const screen = await renderScreen(fetcher);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Marcar leídas" })).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: "Marcar leídas" }));

    await waitFor(() => {
      expect(fetcher).toHaveBeenCalledWith(
        "/api/v1/notifications/read-all",
        expect.objectContaining({ method: "POST" }),
      );
    });
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Marcar leídas" })).not.toBeOnTheScreen();
    });
    expect(screen.queryByText("Sin leer")).not.toBeOnTheScreen();
  });

  it("shows the empty state without the mark-all action", async () => {
    const screen = await renderScreen(
      createFetcher([{ items: [], hasMore: false, nextCursor: null }]),
    );

    await waitFor(() => {
      expect(screen.getByText("No tienes notificaciones.")).toBeOnTheScreen();
    });
    // MOB-041: 19's and S20's bare empty state, a quiet bell over Lora 21.
    expect(screen.getByText("No tienes notificaciones.")).toHaveStyle({
      fontFamily: "Lora_500Medium",
      fontSize: 21,
    });
    const bell = screen.getByTestId("empty-state-icon-bell", {
      includeHiddenElements: true,
    });
    expect(bell).toHaveProp("stroke", "#C4BAB6");
    expect(bell).toHaveProp("width", 34);
    expect(
      screen.getByText("Aquí te avisaremos sobre tus clases, pagos y evaluaciones."),
    ).toHaveStyle({ color: "#766D69", fontSize: 14 });
    expect(screen.queryByRole("button", { name: "Marcar leídas" })).not.toBeOnTheScreen();
  });

  it("points to the system settings once notifications are denied", async () => {
    const openSettings = jest.fn();
    const screen = await render(
      <MobileQueryProvider>
        <PushNotificationsContext.Provider
          value={{ permissionStatus: "denied", offerPermission: jest.fn(), openSettings }}
        >
          <NotificationsScreen
            emptySupport="Aquí te avisaremos sobre tus clases, pagos y evaluaciones."
            fetcher={createFetcher([{ items, hasMore: false, nextCursor: null }])}
            now={now}
            onBack={jest.fn()}
          />
        </PushNotificationsContext.Provider>
      </MobileQueryProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Las notificaciones están desactivadas/)).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: "Abrir Ajustes" }));
    expect(openSettings).toHaveBeenCalled();
  });

  it("shows no settings notice while notifications are allowed or not yet asked", async () => {
    const screen = await renderScreen(createFetcher([{ items, hasMore: false, nextCursor: null }]));

    await waitFor(() => {
      expect(screen.getByText("Sin leer")).toBeOnTheScreen();
    });
    expect(screen.queryByRole("button", { name: "Abrir Ajustes" })).not.toBeOnTheScreen();
  });
});
