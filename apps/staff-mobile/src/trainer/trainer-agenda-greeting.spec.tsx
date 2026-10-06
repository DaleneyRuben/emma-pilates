import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(20_000);

// 14:00Z–14:50Z is 10:00–10:50 in Bolivia.
const session = {
  bookedCount: 6,
  branchName: "Sopocachi",
  capacity: 8,
  classTypeName: "Reformer Pilates",
  endsAt: "2026-09-10T14:50:00.000Z",
  sessionId: "session-1",
  startsAt: "2026-09-10T14:00:00.000Z",
};

const renderTrainer = () =>
  render(
    <App
      runtime={createStaffRuntime(
        routeFetcher({
          "/api/v1/trainer/sessions": () => jsonResponse([session]),
          "/api/v1/trainer/sessions/session-1/roster": () =>
            jsonResponse({ ...session, bookings: [] }),
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
        }),
      )}
    />,
  );

// MOB-043: S02 greets the Trainer by her first name, as S15 greets the
// Nutritionist and the frame greets «Hola, Camila», and writes its times in
// the 24-hour form every frame and the other lists use.
describe("Trainer agenda greeting and times", () => {
  afterEach(() => {
    cleanup();
    clearMobileQueryCache();
  });

  it("greets the Trainer by her first name", async () => {
    const screen = await renderTrainer();

    await waitFor(() => {
      expect(screen.getByLabelText("Mi agenda")).toHaveTextContent("Hola, Emma");
    });
  });

  it("writes the agenda and roster times as «10:00 – 10:50»", async () => {
    const screen = await renderTrainer();

    await waitFor(() => {
      expect(screen.getByText("10:00 – 10:50")).toBeOnTheScreen();
    });
    fireEvent.press(screen.getByRole("button", { name: "Reformer Pilates" }));
    await waitFor(() => {
      expect(screen.getByText("Sopocachi · 10:00 – 10:50")).toBeOnTheScreen();
    });
  });
});
