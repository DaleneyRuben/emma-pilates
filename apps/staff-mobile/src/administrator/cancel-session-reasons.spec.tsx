import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(20_000);

const administrator = {
  id: "staff-2",
  name: "Paola Mendoza",
  email: "paola.mendoza@example.com",
  phone: null,
  role: "administrator",
  branches: [],
};
const startsAt = new Date(Date.now() + 5 * 3_600_000);
const empty = {
  id: "session-9",
  branchId: "branch-centro",
  classTypeId: "class-reformer",
  trainerStaffMemberId: "trainer-1",
  classTypeName: "Reformer Principiante",
  trainerName: "Daniela Ortiz",
  startsAt: startsAt.toISOString(),
  endsAt: new Date(startsAt.getTime() + 3_600_000).toISOString(),
  capacity: 8,
  bookedCount: 0,
  availableSeats: 8,
  waitlistCount: 0,
};

async function openEmptySession(answer: () => Response) {
  const screen = await render(
    <App
      runtime={createStaffRuntime(
        routeFetcher({
          "/api/v1/staff-members/current": () => jsonResponse(administrator),
          "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
          "/api/v1/administrator/payments/pending": () => jsonResponse([]),
          "/api/v1/administrator/freezes": () => jsonResponse([]),
          "/api/v1/branches": () =>
            jsonResponse([{ id: "branch-centro", name: "Centro", address: "Calle 1" }]),
          "/api/v1/class-types": () => jsonResponse([]),
          "/api/v1/sessions": () => jsonResponse([empty]),
          "POST /api/v1/administrator/sessions/session-9/cancel": answer,
        }),
        "administrator",
      )}
    />,
  );
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Cancelar una clase" })).toBeOnTheScreen(),
  );
  await fireEvent.press(screen.getByRole("button", { name: "Cancelar una clase" }));
  await fireEvent.press(await screen.findByRole("button", { name: /^Reformer Principiante/ }));
  await waitFor(() => expect(screen.getByLabelText("Cancelar sesión")).toBeOnTheScreen());
  return screen;
}

// Walkthrough 24: an empty class can be cancelled, and a refusal says why.
describe("Cancelar sesión (S14) without bookings and its refusals", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("cancels a class with no bookings after the short confirmation", async () => {
    const screen = await openEmptySession(() => jsonResponse({ affectedBookings: 0 }));

    expect(
      screen.getByText("Esto no se puede deshacer. La clase no tiene reservas."),
    ).toBeOnTheScreen();
    expect(screen.queryByText("Qué va a pasar")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Sí, cancelar sesión" }));
    await waitFor(() => expect(screen.getByText("Sesión cancelada")).toBeOnTheScreen());
    expect(screen.getByText("La clase no tenía reservas.")).toBeOnTheScreen();
  });

  it.each([
    ["session_not_cancellable", "Esta clase ya empezó o ya está cancelada."],
    ["session_has_no_bookings", "El servidor todavía no deja cancelar una clase sin reservas."],
    ["booking_access_denied", "Tu cuenta no puede cancelar clases."],
  ])("names the reason for %s", async (code, message) => {
    const screen = await openEmptySession(() => jsonResponse({ code }, 409));

    await fireEvent.press(screen.getByRole("button", { name: "Sí, cancelar sesión" }));
    expect(await screen.findByText(message)).toBeOnTheScreen();
    expect(screen.queryByText(/Inténtalo de nuevo/)).toBeNull();
  });
});
