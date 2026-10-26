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

  it("shows the unread count on the Perfil tab and announces it", async () => {
    const screen = await render(<App runtime={withUnread(2)} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /^Perfil, 2 notificaciones sin leer/ }),
      ).toBeOnTheScreen();
    });
    expect(screen.getByTestId("profile-tab-badge", { includeHiddenElements: true })).toHaveStyle({
      backgroundColor: "#8A5D59",
    });
  });

  it("hides the tab badge at zero", async () => {
    const screen = await render(<App runtime={withUnread(0)} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Perfil, tab/ })).toBeOnTheScreen();
    });
    expect(
      screen.queryByTestId("profile-tab-badge", { includeHiddenElements: true }),
    ).not.toBeOnTheScreen();
  });

  it("caps the Notificaciones row count at 9+ in Palo de rosa profundo", async () => {
    const screen = await openProfile(withUnread(12));

    await waitFor(() => {
      expect(
        screen.getByTestId("notifications-row-badge", {
          includeHiddenElements: true,
        }),
      ).toBeOnTheScreen();
    });
    expect(
      screen.getByTestId("notifications-row-badge", {
        includeHiddenElements: true,
      }),
    ).toHaveStyle({
      backgroundColor: "#8A5D59",
    });
    expect(screen.getAllByText("9+", { includeHiddenElements: true }).length).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", {
        name: "Notificaciones, 12 notificaciones sin leer",
      }),
    ).toBeOnTheScreen();
    expect(screen.getAllByText("9+", { includeHiddenElements: true })[0]?.parent).toHaveProp(
      "importantForAccessibility",
      "no-hide-descendants",
    );
  });
});
