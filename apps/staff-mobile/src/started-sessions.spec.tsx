import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { boliviaCivilDate, civilDateRange, clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../App";
import { assistantRoutes, hour, openLucia, session } from "./assistant/assistant-fixtures";
import { createStaffRuntime, jsonResponse, routeFetcher } from "./test-support";

jest.setTimeout(20_000);

const { from, until } = civilDateRange(boliviaCivilDate(new Date()));
const centroDay = `/api/v1/sessions?branchId=branch-centro&from=${encodeURIComponent(from)}&until=${encodeURIComponent(until)}&limit=100`;

// Started an hour ago, still running: the backend refuses a Booking into it
// and refuses to cancel it, so a list that leads to either hides it.
const startedAt = new Date(Date.now() - hour);
const started = {
  ...session,
  id: "session-started",
  classTypeName: "Mat Pilates",
  classTypeId: "class-mat",
  startsAt: startedAt.toISOString(),
  endsAt: new Date(startedAt.getTime() + 50 * 60_000).toISOString(),
};

const staffMember = (role: string, name: string) => ({
  id: "staff-1",
  name,
  email: "staff@example.com",
  phone: null,
  role,
  branches: [],
});

// MOB-044: today's Sessions that already started stay on the Trainer's agenda
// (attendance is marked after the class) and leave the Assistant's booking
// list and the Administrator's cancel list, like the Client's 03.
describe("started Sessions on the Staff lists", () => {
  afterEach(() => {
    cleanup();
    clearMobileQueryCache();
  });

  it("hides a started Session from the Assistant's booking list", async () => {
    const screen = await openLucia({
      ...assistantRoutes(),
      [centroDay]: () => jsonResponse([started, session]),
    });

    await fireEvent.press(screen.getByRole("button", { name: "Reservar clase" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Reformer Pilates \d/ })).toBeOnTheScreen();
    });
    expect(screen.queryByRole("button", { name: /^Mat Pilates \d/ })).toBeNull();
  });

  it("hides a started Session from the Administrator's cancel list", async () => {
    const screen = await render(
      <App
        runtime={createStaffRuntime(
          routeFetcher({
            "/api/v1/staff-members/current": () =>
              jsonResponse(staffMember("administrator", "Paola Mendoza")),
            "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
            "/api/v1/administrator/payments/pending": () => jsonResponse([]),
            "/api/v1/branches": () =>
              jsonResponse([{ id: "branch-centro", name: "Centro", address: "Calle Ayacucho 245" }]),
            "/api/v1/class-types": () =>
              jsonResponse([
                { id: "class-reformer", name: "Reformer Pilates", description: "", durationMinutes: 50 },
                { id: "class-mat", name: "Mat Pilates", description: "", durationMinutes: 50 },
              ]),
            [centroDay]: () => jsonResponse([started, session]),
          }),
          "administrator",
        )}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Cancelar una clase" })).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: "Cancelar una clase" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Reformer Pilates \d/ })).toBeOnTheScreen();
    });
    expect(screen.queryByRole("button", { name: /^Mat Pilates \d/ })).toBeNull();
  });

  it("keeps a finished Session on the Trainer's agenda", async () => {
    const endedAt = new Date(Date.now() - hour);
    const screen = await render(
      <App
        runtime={createStaffRuntime(
          routeFetcher({
            "/api/v1/trainer/sessions": () =>
              jsonResponse([
                {
                  bookedCount: 6,
                  branchName: "Centro",
                  capacity: 8,
                  classTypeName: "Mat Pilates",
                  endsAt: endedAt.toISOString(),
                  sessionId: "session-started",
                  startsAt: new Date(endedAt.getTime() - 50 * 60_000).toISOString(),
                },
              ]),
            "/api/v1/staff-members/current": () =>
              jsonResponse(staffMember("trainer", "Emma Vargas")),
            "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
          }),
        )}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Mat Pilates" })).toBeOnTheScreen();
    });
  });
});
