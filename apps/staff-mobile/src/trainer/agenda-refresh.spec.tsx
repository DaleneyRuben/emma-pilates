import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";

const session = (sessionId: string, classTypeName: string, bookedCount: number) => ({
  bookedCount,
  branchName: "Centro",
  capacity: 8,
  classTypeName,
  endsAt: "2026-09-10T15:00:00.000Z",
  sessionId,
  startsAt: "2026-09-10T14:00:00.000Z",
});

async function openAgenda(schedule: () => unknown[]) {
  const fetcher = routeFetcher({
    "/api/v1/trainer/sessions": () => jsonResponse(schedule()),
    "/api/v1/trainer/sessions/session-1/roster": () =>
      jsonResponse({ ...session("session-1", "Reformer Pilates", 6), bookings: [] }),
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
  await waitFor(() => expect(screen.getByText("Reformer Pilates")).toBeOnTheScreen());
  return screen;
}

// UX-004: a Staff root stays mounted under the screens it opens, so it
// refetches when it regains focus and on a pull.
describe("Trainer agenda refresh (UX-004)", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("refetches the agenda when the roster closes", async () => {
    let schedule = [session("session-1", "Reformer Pilates", 6)];
    const screen = await openAgenda(() => schedule);

    await fireEvent.press(screen.getByRole("button", { name: /^Reformer Pilates,/ }));
    await waitFor(() =>
      expect(screen.getByText("No hay reservas para esta sesión.")).toBeOnTheScreen(),
    );
    schedule = [session("session-1", "Reformer Pilates", 7)];

    await fireEvent.press(screen.getByTestId("back-chevron", { includeHiddenElements: true }));

    await waitFor(() => expect(screen.getByText("7 de 8 reservados")).toBeOnTheScreen());
  });

  it("refetches the agenda on a pull", async () => {
    let schedule = [session("session-1", "Reformer Pilates", 6)];
    const screen = await openAgenda(() => schedule);
    schedule = [
      session("session-1", "Reformer Pilates", 6),
      session("session-2", "Mat Pilates", 2),
    ];

    const [control] = screen.getByTestId("agenda-scroll").children;
    if (typeof control === "string") throw new Error("The control is the first child");
    await fireEvent(control, "refresh");

    await waitFor(() => expect(screen.getByText("Mat Pilates")).toBeOnTheScreen());
  });
});
