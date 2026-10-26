import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";

const hidden = { includeHiddenElements: true };

const session = {
  bookedCount: 0,
  branchName: "Centro",
  capacity: 8,
  classTypeName: "Reformer Pilates",
  endsAt: "2000-09-10T11:00:00.000Z",
  sessionId: "session-1",
  startsAt: "2000-09-10T10:00:00.000Z",
};

const staff = {
  id: "staff-1",
  name: "Emma Vargas",
  email: "emma.vargas@example.com",
  phone: null,
  role: "trainer",
  branches: [],
};

async function openRoster(bookings: unknown[], endsAt = session.endsAt) {
  const fetcher = routeFetcher({
    "/api/v1/trainer/sessions": () => jsonResponse([{ ...session, endsAt }]),
    "/api/v1/trainer/sessions/session-1/roster": () =>
      jsonResponse({ ...session, endsAt, bookings }),
    "/api/v1/staff-members/current": () => jsonResponse(staff),
    "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
  });
  const screen = await render(<App runtime={createStaffRuntime(fetcher)} />);
  await waitFor(() => expect(screen.getByText("Reformer Pilates")).toBeOnTheScreen());
  await fireEvent.press(screen.getByRole("button", { name: /^Reformer Pilates,/ }));
  return { fetcher, screen };
}

// UX-009: a past Session with no bookings draws the plain empty state and
// keeps «Guardar asistencia» disabled, because there is nothing to save.
describe("Trainer roster empty state (UX-009)", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("draws the plain empty state and disables Guardar asistencia when nobody booked", async () => {
    const { fetcher, screen } = await openRoster([]);

    await waitFor(() => {
      expect(screen.getByText("Sin reservas")).toHaveStyle({
        fontFamily: "Lora_500Medium",
        fontSize: 21,
        textAlign: "center",
      });
    });
    expect(screen.getByText("No hay reservas para esta sesión.")).toHaveStyle({
      color: "#766D69",
      fontSize: 14,
    });
    expect(screen.getByTestId("empty-state-icon-calendar", hidden)).toHaveProp("stroke", "#C4BAB6");
    expect(screen.getByRole("button", { name: "Guardar asistencia" })).toHaveProp(
      "accessibilityState",
      { busy: false, disabled: true },
    );

    await fireEvent.press(screen.getByRole("button", { name: "Guardar asistencia" }));
    expect(fetcher).not.toHaveBeenCalledWith(
      "/api/v1/sessions/session-1/attendance",
      expect.anything(),
    );
  });

  it("keeps the roster and an enabled save when the past Session has bookings", async () => {
    const { screen } = await openRoster([
      { bookingId: "booking-1", clientName: "Ana Pérez", attendanceOutcome: "attended" },
    ]);

    await waitFor(() => {
      expect(screen.getByText("Ana Pérez")).toBeOnTheScreen();
    });
    expect(screen.queryByText("Sin reservas")).toBeNull();
    expect(screen.getByRole("button", { name: "Guardar asistencia" })).toHaveProp(
      "accessibilityState",
      { busy: false, disabled: false },
    );
  });

  it("keeps an upcoming Session with bookings on the current roster and note", async () => {
    const { screen } = await openRoster(
      [{ bookingId: "booking-1", clientName: "Ana Pérez" }],
      "2099-09-10T11:00:00.000Z",
    );

    await waitFor(() => {
      expect(screen.getByText("Ana Pérez")).toBeOnTheScreen();
    });
    expect(screen.getByText("Podrás marcar asistencia cuando termine la clase.")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Guardar asistencia" })).toBeNull();
    expect(screen.queryByText("Sin reservas")).toBeNull();
  });
});
