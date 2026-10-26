import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(20_000);

const session = {
  bookedCount: 6,
  branchName: "Sopocachi",
  capacity: 8,
  classTypeName: "Reformer Pilates",
  endsAt: "2026-09-10T15:00:00.000Z",
  sessionId: "session-1",
  startsAt: "2026-09-10T14:00:00.000Z",
};

const profile = () =>
  jsonResponse({
    id: "staff-1",
    name: "Emma Vargas",
    email: "emma.vargas@example.com",
    phone: null,
    role: "trainer",
    branches: [],
  });

// STAFF-005: a generated query resolves a 403 or 500 as data, so isError stays
// false and reading the body throws during render.
describe("Trainer screens on an HTTP error", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("shows Reintentar when the agenda answers 403, and loads once the retry succeeds", async () => {
    let status = 403;
    const screen = await render(
      <App
        runtime={createStaffRuntime(
          routeFetcher({
            "/api/v1/trainer/sessions": () =>
              status === 200 ? jsonResponse([]) : jsonResponse({ code: "forbidden" }, status),
            "/api/v1/staff-members/current": profile,
            "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
          }),
        )}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("No pudimos cargar tu agenda.");
    });
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeOnTheScreen();
    expect(screen.queryByText("Algo salió mal")).toBeNull();

    status = 200;
    await fireEvent.press(screen.getByRole("button", { name: "Reintentar" }));

    await waitFor(() => {
      expect(screen.getByText("No tienes clases este día.")).toBeOnTheScreen();
    });
  });

  it("shows Reintentar when the roster answers 500 instead of throwing", async () => {
    const screen = await render(
      <App
        runtime={createStaffRuntime(
          routeFetcher({
            "/api/v1/trainer/sessions": () => jsonResponse([session]),
            "/api/v1/trainer/sessions/session-1/roster": () =>
              jsonResponse({ code: "internal" }, 500),
            "/api/v1/staff-members/current": profile,
            "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
          }),
        )}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Reformer Pilates")).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: /^Reformer Pilates,/ }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "No pudimos cargar la lista de asistencia.",
      );
    });
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeOnTheScreen();
    expect(screen.queryByText("Algo salió mal")).toBeNull();
  });
});
