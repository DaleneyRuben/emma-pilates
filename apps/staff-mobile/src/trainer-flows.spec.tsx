import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";
import { focusManager } from "@tanstack/react-query";

import App from "../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "./test-support";

const session = {
  bookedCount: 6,
  branchName: "Sopocachi",
  capacity: 8,
  classTypeName: "Reformer Pilates",
  endsAt: "2026-09-10T15:00:00.000Z",
  sessionId: "session-1",
  startsAt: "2026-09-10T14:00:00.000Z",
};

describe("Trainer agenda and attendance", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("shows a Session, restores saved outcomes, and saves a correction", async () => {
    const fetcher = routeFetcher({
      "/api/v1/trainer/sessions": () => jsonResponse([session]),
      "/api/v1/trainer/sessions/session-1/roster": () =>
        jsonResponse({
          ...session,
          endsAt: "2000-09-10T11:00:00.000Z",
          bookings: [
            {
              bookingId: "booking-1",
              clientName: "Ana Pérez",
              attendanceOutcome: "attended",
            },
            {
              bookingId: "booking-2",
              clientName: "Luis Flores",
              attendanceOutcome: "no_show",
            },
          ],
        }),
      "POST /api/v1/sessions/session-1/attendance": () => new Response(null, { status: 201 }),
      "/api/v1/staff-members/current": () =>
        jsonResponse({
          id: "staff-1",
          name: "Emma Vargas",
          email: "emma.vargas@example.com",
          phone: null,
          role: "trainer",
          branches: [],
        }),
      "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
    });
    const screen = await render(<App runtime={createStaffRuntime(fetcher)} />);

    await waitFor(() => {
      expect(screen.getByText("Reformer Pilates")).toBeOnTheScreen();
      expect(screen.getByText("6 de 8 reservados")).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: /^Reformer Pilates,/ }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Ana Pérez: Asistió" })).toHaveProp(
        "accessibilityState",
        { selected: true },
      ),
    );
    // S03 (MOB-034): the chevron above the large title, not «← Volver».
    expect(screen.queryByText("← Volver")).toBeNull();
    expect(screen.getByTestId("back-chevron", { includeHiddenElements: true })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Luis Flores: Asistió" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Luis Flores: Asistió" })).toHaveProp(
        "accessibilityState",
        { selected: true },
      ),
    );
    await fireEvent.press(screen.getByRole("button", { name: "Guardar asistencia" }));

    await waitFor(() => {
      expect(fetcher).toHaveBeenCalledWith(
        "/api/v1/sessions/session-1/attendance",
        expect.objectContaining({
          body: JSON.stringify({
            outcomes: [
              { bookingId: "booking-1", outcome: "attended" },
              { bookingId: "booking-2", outcome: "attended" },
            ],
          }),
        }),
      );
      expect(screen.getByText("Asistencia guardada.")).toBeOnTheScreen();
    });
  });

  // MOB-052: the outcomes are the saved ones plus the Trainer's taps, computed
  // during render, so a refetch (foreground, reconnect) cannot undo a tap.
  it("keeps an unsaved tap when the roster refetches with other changes", async () => {
    let saved: Array<{ bookingId: string; clientName: string; attendanceOutcome?: string }> = [
      { bookingId: "booking-1", clientName: "Ana Pérez", attendanceOutcome: "attended" },
      { bookingId: "booking-2", clientName: "Luis Flores" },
    ];
    const fetcher = routeFetcher({
      "/api/v1/trainer/sessions": () => jsonResponse([session]),
      "/api/v1/trainer/sessions/session-1/roster": () =>
        jsonResponse({ ...session, endsAt: "2000-09-10T11:00:00.000Z", bookings: saved }),
      "/api/v1/staff-members/current": () =>
        jsonResponse({
          id: "staff-1",
          name: "Emma Vargas",
          email: "emma.vargas@example.com",
          phone: null,
          role: "trainer",
          branches: [],
        }),
      "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
    });
    const screen = await render(<App runtime={createStaffRuntime(fetcher)} />);

    await waitFor(() => {
      expect(screen.getByText("Reformer Pilates")).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: /^Reformer Pilates,/ }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Ana Pérez: Asistió" })).toHaveProp(
        "accessibilityState",
        { selected: true },
      ),
    );
    await fireEvent.press(screen.getByRole("button", { name: "Luis Flores: Asistió" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Luis Flores: Asistió" })).toHaveProp(
        "accessibilityState",
        { selected: true },
      ),
    );

    saved = [
      { bookingId: "booking-1", clientName: "Ana Pérez", attendanceOutcome: "no_show" },
      { bookingId: "booking-2", clientName: "Luis Flores" },
    ];
    await act(async () => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Ana Pérez: No asistió" })).toHaveProp(
        "accessibilityState",
        { selected: true },
      ),
    );
    expect(screen.getByRole("button", { name: "Luis Flores: Asistió" })).toHaveProp(
      "accessibilityState",
      { selected: true },
    );
  });
});
