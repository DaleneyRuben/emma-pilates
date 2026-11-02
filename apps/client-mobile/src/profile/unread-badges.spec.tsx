import { cleanup, render, waitFor } from "@testing-library/react-native";
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
