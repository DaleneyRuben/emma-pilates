import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(20_000);

const trainer = {
  id: "staff-1",
  name: "Emma Vargas",
  email: "emma.vargas@example.com",
  phone: null,
  role: "trainer",
  branches: [{ id: "branch-1", name: "Centro" }],
};

const runtime = (unread: number) =>
  createStaffRuntime(
    routeFetcher({
      "/api/v1/trainer/sessions": () => jsonResponse([]),
      "/api/v1/staff-members/current": () => jsonResponse(trainer),
      "/api/v1/notifications/unread-count": () => jsonResponse({ unread }),
      "/api/v1/notifications": () => jsonResponse({ items: [], hasMore: false, nextCursor: null }),
    }),
  );

// Follow-up 73: a dot without number on the avatar, the count on S23's row.
describe("Staff unread language", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("marks the avatar with a Palo de rosa profundo dot and says so", async () => {
    const screen = await render(<App runtime={runtime(3)} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Tu cuenta, notificaciones sin leer" }),
      ).toBeOnTheScreen();
    });
    expect(screen.getByTestId("account-avatar-dot")).toHaveStyle({
      backgroundColor: "#8A5D59",
    });
  });

  it("shows the unread count on S23's Notificaciones row", async () => {
    const screen = await render(<App runtime={runtime(12)} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Tu cuenta, notificaciones sin leer" }),
      ).toBeOnTheScreen();
    });
    await fireEvent.press(
      screen.getByRole("button", { name: "Tu cuenta, notificaciones sin leer" }),
    );

    await waitFor(() => {
      expect(
        screen.getByTestId("notifications-row-badge", {
          includeHiddenElements: true,
        }),
      ).toBeOnTheScreen();
    });
    expect(screen.getByText("9+", { includeHiddenElements: true })).toBeOnTheScreen();
    expect(
      screen.getByRole("button", {
        name: "Notificaciones, 12 notificaciones sin leer",
      }),
    ).toBeOnTheScreen();
    expect(screen.getAllByText("9+", { includeHiddenElements: true })[0]?.parent).toHaveProp(
      "importantForAccessibility",
      "no-hide-descendants",
    );
    // MOB-041: S23's three menu rows end in the 19 pt Icono tenue chevron.
    const chevrons = screen.getAllByTestId("chevron", { includeHiddenElements: true });
    expect(chevrons).toHaveLength(3);
    for (const chevron of chevrons) {
      expect(chevron).toHaveProp("stroke", "#C4BAB6");
    }
    expect(screen.queryByText("›")).toBeNull();
  });
});
