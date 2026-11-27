import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";

import { clearMobileQueryCache, MobileQueryProvider } from "../query/provider";
import { NotificationsScreen } from "./notifications-screen";

const now = () => new Date("2026-09-22T15:00:00.000Z");

function jsonResponse(body: unknown, status = 200) {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

const notice = (id: string, title: string) => ({
  id,
  category: "subscription_payment",
  type: "payment_confirmed",
  title,
  message: `${title}.`,
  destinationType: null,
  destinationId: null,
  createdAt: "2026-09-22T14:55:00.000Z",
  readAt: null,
});

const page = {
  items: [notice("n1", "Pago confirmado"), notice("n2", "Recordatorio de clase")],
  hasMore: false,
  nextCursor: null,
};

function createFetcher() {
  const calls: string[] = [];
  const fetcher = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const path = typeof input === "string" ? input : input.toString();
    const method = init?.method?.toUpperCase() ?? "GET";
    if (method !== "GET") calls.push(`${method} ${path}`);
    if (method === "GET" && path.startsWith("/api/v1/notifications")) {
      return Promise.resolve(jsonResponse(page));
    }
    return Promise.resolve(jsonResponse(null, 204));
  }) as unknown as typeof globalThis.fetch;
  return { calls, fetcher };
}

// Walkthrough n.º 10 (C19c, C19d): one notification at a time, with «Deshacer»
// for a few seconds; no «Borrar todas».
describe("NotificationsScreen removal", () => {
  afterEach(() => {
    jest.useRealTimers();
    cleanup();
    clearMobileQueryCache();
  });

  const renderScreen = (fetcher: typeof globalThis.fetch) =>
    render(
      <MobileQueryProvider>
        <NotificationsScreen
          emptySupport="Aquí te avisaremos."
          fetcher={fetcher}
          now={now}
          onBack={jest.fn()}
        />
      </MobileQueryProvider>,
    );

  it("removes one notification and brings it back with «Deshacer»", async () => {
    const { calls, fetcher } = createFetcher();
    const screen = await renderScreen(fetcher);
    await waitFor(() => expect(screen.getByText("Pago confirmado")).toBeOnTheScreen());
    expect(screen.queryByText(/Borrar todas/)).not.toBeOnTheScreen();

    await fireEvent.press(
      screen.getAllByRole("button", { name: "Borrar", includeHiddenElements: true })[0]!,
    );

    await waitFor(() => expect(screen.queryByText("Pago confirmado")).not.toBeOnTheScreen());
    expect(screen.getByText("Nuevas · 1")).toBeOnTheScreen();
    expect(screen.getByText("Notificación borrada")).toBeOnTheScreen();
    expect(calls).toEqual(["DELETE /api/v1/notifications/n1"]);

    await fireEvent.press(screen.getByRole("button", { name: "Deshacer" }));

    await waitFor(() => expect(screen.getByText("Pago confirmado")).toBeOnTheScreen());
    expect(calls).toEqual([
      "DELETE /api/v1/notifications/n1",
      "POST /api/v1/notifications/n1/restore",
    ]);
    expect(screen.queryByText("Notificación borrada")).not.toBeOnTheScreen();
  });

  // Review: an undo while the delete is still on its way must not reach the
  // server first, or the delete lands after it and the undo is lost.
  it("restores only once the delete has been answered", async () => {
    const calls: string[] = [];
    let answerDelete: () => void = () => undefined;
    const fetcher = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const path = typeof input === "string" ? input : input.toString();
      const method = init?.method?.toUpperCase() ?? "GET";
      if (method === "GET") return Promise.resolve(jsonResponse(page));
      calls.push(`${method} ${path}`);
      if (method === "DELETE") {
        return new Promise<Response>((resolve) => {
          answerDelete = () => resolve(jsonResponse(null, 204));
        });
      }
      return Promise.resolve(jsonResponse(null, 204));
    }) as unknown as typeof globalThis.fetch;
    const screen = await renderScreen(fetcher);
    await waitFor(() => expect(screen.getByText("Pago confirmado")).toBeOnTheScreen());

    await fireEvent.press(
      screen.getAllByRole("button", { name: "Borrar", includeHiddenElements: true })[0]!,
    );
    await fireEvent.press(screen.getByRole("button", { name: "Deshacer" }));

    expect(calls).toEqual(["DELETE /api/v1/notifications/n1"]);
    await act(async () => answerDelete());
    await waitFor(() =>
      expect(calls).toEqual([
        "DELETE /api/v1/notifications/n1",
        "POST /api/v1/notifications/n1/restore",
      ]),
    );
  });

  it("lets the «Deshacer» notice go after a few seconds", async () => {
    const { fetcher } = createFetcher();
    const screen = await renderScreen(fetcher);
    await waitFor(() => expect(screen.getByText("Pago confirmado")).toBeOnTheScreen());
    jest.useFakeTimers();

    await fireEvent.press(
      screen.getAllByRole("button", { name: "Borrar", includeHiddenElements: true })[0]!,
    );
    expect(screen.getByText("Notificación borrada")).toBeOnTheScreen();
    await act(() => jest.advanceTimersByTime(6000));

    expect(screen.queryByText("Notificación borrada")).not.toBeOnTheScreen();
    expect(screen.queryByText("Pago confirmado")).not.toBeOnTheScreen();
  });
});
