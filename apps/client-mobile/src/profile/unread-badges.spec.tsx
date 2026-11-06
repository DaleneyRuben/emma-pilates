import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";
import { openProfile, readRoutes } from "./profile-test-support";

jest.setTimeout(20_000);

const withUnread = (unread: number) =>
  createClientRuntime(
    routeFetcher({
      ...readRoutes,
      "/api/v1/notifications/unread-count": () => jsonResponse({ unread }),
    }),
  );

// Follow-up 73: one unread colour, Palo de rosa profundo, never Error red.
describe("Client unread badges", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("shows the unread count on the Inicio bell and announces it", async () => {
    const screen = await render(<App runtime={withUnread(2)} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Notificaciones, 2 sin leer" })).toBeOnTheScreen();
    });
    expect(
      screen.getByTestId("home-bell-badge", { includeHiddenElements: true }),
    ).toBeOnTheScreen();
  });

  it("keeps the Perfil tab free of the count (owner, 2026-11-02)", async () => {
    const screen = await render(<App runtime={withUnread(2)} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Notificaciones, 2 sin leer" })).toBeOnTheScreen();
    });
    expect(screen.getByRole("button", { name: /^Perfil, tab/ })).toBeOnTheScreen();
    expect(
      screen.queryByTestId("profile-tab-badge", { includeHiddenElements: true }),
    ).not.toBeOnTheScreen();
  });

  it("leads back to Inicio from the empty inbox (C19b)", async () => {
    const screen = await render(
      <App
        runtime={createClientRuntime(
          routeFetcher({
            ...readRoutes,
            "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
            "/api/v1/notifications?limit=50": () =>
              jsonResponse({ items: [], hasMore: false, nextCursor: null }),
          }),
        )}
      />,
    );

    await fireEvent.press(await screen.findByRole("button", { name: "Notificaciones" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Volver al inicio" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Notificaciones" })).toBeOnTheScreen();
    });
  });

  // Design follow-up 254 § 3: the bar stays on a browsing screen such as
  // Notificaciones, and hides only inside a task such as Editar perfil.
  it("keeps the tab bar on a browsing screen and hides it inside a task", async () => {
    const screen = await render(<App runtime={withUnread(2)} />);

    await fireEvent.press(
      await screen.findByRole("button", { name: "Notificaciones, 2 sin leer" }),
    );
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Volver" })).toBeOnTheScreen();
    });
    expect(screen.getByRole("button", { name: /^Reservar, tab/ })).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Volver" }));
    await fireEvent.press(await screen.findByRole("button", { name: /^Perfil, tab/ }));
    await fireEvent.press(await screen.findByRole("button", { name: "Editar" }));
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /^Reservar, tab/ })).toBeNull();
    });
  });

  it("names the bell without a count at zero", async () => {
    const screen = await render(<App runtime={withUnread(0)} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Notificaciones" })).toBeOnTheScreen();
    });
    expect(
      screen.queryByTestId("home-bell-badge", { includeHiddenElements: true }),
    ).not.toBeOnTheScreen();
  });

  it("says the unread count on the Notificaciones row", async () => {
    const screen = await openProfile(withUnread(12));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Notificaciones, 12 sin leer" })).toBeOnTheScreen();
    });
    expect(
      screen.queryByTestId("notifications-row-badge", { includeHiddenElements: true }),
    ).toBeNull();
  });
});
