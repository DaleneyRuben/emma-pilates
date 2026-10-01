import {
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "./test-support";

jest.setTimeout(30_000);

const notice = (destinationType: string, message: string) => ({
  items: [
    {
      id: "n1",
      category: "booking_schedule",
      type: "session_cancelled",
      title: "Aviso",
      message,
      destinationType,
      destinationId: null,
      createdAt: new Date(Date.now() - 60_000).toISOString(),
      readAt: null,
    },
  ],
  hasMore: false,
  nextCursor: null,
});

const profile = (role: string) => ({
  id: "staff-1",
  name: "Emma Vargas",
  email: "emma.vargas@example.com",
  phone: null,
  role,
  branches: [],
});

async function openNoticeAndTap(
  role: "trainer" | "nutritionist",
  destinationType: string,
  agendaMarker: string,
) {
  const fetcher = routeFetcher({
    "/api/v1/staff-members/current": () => jsonResponse(profile(role)),
    "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 1 }),
    "/api/v1/notifications": () =>
      jsonResponse(notice(destinationType, "Tu clase de Mat Pilates de hoy 07:00 se canceló.")),
    "/api/v1/trainer/sessions": () => jsonResponse([]),
    "/api/v1/nutritionist/evaluations": () =>
      jsonResponse({ items: [], hasMore: false, nextCursor: null }),
  });
  const screen = await render(<App runtime={createStaffRuntime(fetcher, role)} />);
  await waitFor(
    () => expect(screen.getByRole("button", { name: /^Tu cuenta/ })).toBeOnTheScreen(),
    { timeout: 10_000 },
  );
  fireEvent.press(screen.getByRole("button", { name: /^Tu cuenta/ }));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: /Notificaciones/ })).toBeOnTheScreen(),
  );
  fireEvent.press(screen.getByRole("button", { name: /Notificaciones/ }));
  await waitFor(() =>
    expect(
      screen.getByText("Tu clase de Mat Pilates de hoy 07:00 se canceló."),
    ).toBeOnTheScreen(),
  );
  fireEvent.press(screen.getByText("Tu clase de Mat Pilates de hoy 07:00 se canceló."));
  await waitFor(() => expect(screen.getByText(agendaMarker)).toBeOnTheScreen());
  expect(screen.queryByText("Tu clase de Mat Pilates de hoy 07:00 se canceló.")).toBeNull();
}

describe("Staff notification destinations", () => {
  afterEach(() => {
    cleanup();
    clearMobileQueryCache();
  });

  it("opens Mi agenda from a trainer_schedule notice", async () => {
    await openNoticeAndTap("trainer", "trainer_schedule", "No tienes clases este día.");
  });

  it("opens the Nutritionist agenda from a nutritionist_agenda notice", async () => {
    await openNoticeAndTap(
      "nutritionist",
      "nutritionist_agenda",
      "No tienes evaluaciones agendadas.",
    );
  });
});
