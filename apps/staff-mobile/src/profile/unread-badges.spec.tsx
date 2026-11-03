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

// v2: the bell on the root carries the count; S23's row repeats it as a pill.
describe("Staff unread language", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("puts the unread count on the bell of Mi agenda and says so", async () => {
    const screen = await render(<App runtime={runtime(3)} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Notificaciones, 3 sin leer" })).toBeOnTheScreen();
    });
    expect(screen.getByTestId("notification-bell-count")).toHaveStyle({
      backgroundColor: "#93615D",
    });
  });

  it("shows the unread count on S23's Notificaciones row", async () => {
    const screen = await render(<App runtime={runtime(12)} />);

    await waitFor(() => expect(screen.getByTestId("tab-profile")).toBeOnTheScreen());
    await fireEvent.press(screen.getByTestId("tab-profile"));

    await waitFor(() => {
      expect(screen.getByTestId("notifications-row-badge")).toBeOnTheScreen();
    });
    expect(screen.getByTestId("notifications-row-badge")).toHaveStyle({
      backgroundColor: "#F2E4E1",
    });
    expect(screen.getAllByText("9+").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", {
        name: "Notificaciones, 12 notificaciones sin leer",
      }),
    ).toBeOnTheScreen();
  });
});
