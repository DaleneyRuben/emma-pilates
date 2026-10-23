import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "./test-support";

jest.setTimeout(30_000);

const notice = (destinationType: string, message: string, destinationId: string | null = null) => ({
  items: [
    {
      id: "n1",
      category: "booking_schedule",
      type: "session_cancelled",
      title: "Aviso",
      message,
      destinationType,
      destinationId,
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
  role: "trainer" | "nutritionist" | "administrator",
  destinationType: string,
  agendaMarker: string,
  destinationId: string | null = null,
) {
  const fetcher = routeFetcher({
    "/api/v1/staff-members/current": () => jsonResponse(profile(role)),
    "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 1 }),
    "/api/v1/notifications": () =>
      jsonResponse(
        notice(destinationType, "Tu clase de Mat Pilates de hoy 07:00 se canceló.", destinationId),
      ),
    "/api/v1/administrator/payments/pending": () => jsonResponse([]),
    "/api/v1/trainer/sessions": () => jsonResponse([]),
    "/api/v1/nutritionist/evaluations": () =>
      jsonResponse({ items: [], hasMore: false, nextCursor: null }),
  });
  const screen = await render(<App runtime={createStaffRuntime(fetcher, role)} />);
  await waitFor(
    () => expect(screen.getByRole("button", { name: /^Tu cuenta/ })).toBeOnTheScreen(),
    { timeout: 10_000 },
  );
  await fireEvent.press(screen.getByRole("button", { name: /^Tu cuenta/ }));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: /Notificaciones/ })).toBeOnTheScreen(),
  );
  await fireEvent.press(screen.getByRole("button", { name: /Notificaciones/ }));
  await waitFor(() =>
    expect(screen.getByText("Tu clase de Mat Pilates de hoy 07:00 se canceló.")).toBeOnTheScreen(),
  );
  await fireEvent.press(screen.getByText("Tu clase de Mat Pilates de hoy 07:00 se canceló."));
  await waitFor(() => expect(screen.getByText(agendaMarker)).toBeOnTheScreen());
  expect(screen.queryByText("Tu clase de Mat Pilates de hoy 07:00 se canceló.")).toBeNull();
}

describe("Staff notification destinations", () => {
  afterEach(async () => {
    await cleanup();
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

  it("opens the submitted payment from an Administrator's payment notice", async () => {
    await openNoticeAndTap(
      "administrator",
      "payment",
      "Revisar pago",
      "22222222-2222-4222-8222-222222222222",
    );
  });

  it("opens the Client from an Assistant's client notice", async () => {
    const clientId = "33333333-3333-4333-8333-333333333333";
    const fetcher = routeFetcher({
      "/api/v1/staff-members/current": () =>
        jsonResponse({
          id: "staff-3",
          name: "Camila Rojas",
          email: "camila.rojas@example.com",
          phone: null,
          role: "assistant",
          branches: [{ id: "branch-centro", name: "Centro" }],
        }),
      "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 1 }),
      "/api/v1/notifications": () =>
        jsonResponse(
          notice("client", "Nuevo pago en efectivo confirmado para Lucía Fernández.", clientId),
        ),
      [`/api/v1/assistant/clients/${clientId}`]: () =>
        jsonResponse({
          client: {
            id: clientId,
            name: "Lucía Fernández",
            email: "lucia@example.com",
            phone: null,
            accountStatus: "active",
          },
          subscription: { status: "none", subscription: null },
          nextBooking: null,
          recentHistory: [],
          creditAvailableCentavos: 0,
        }),
    });
    const screen = await render(<App runtime={createStaffRuntime(fetcher, "assistant")} />);
    await waitFor(
      () => expect(screen.getByRole("button", { name: /^Tu cuenta/ })).toBeOnTheScreen(),
      { timeout: 10_000 },
    );
    await fireEvent.press(screen.getByRole("button", { name: /^Tu cuenta/ }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Notificaciones/ })).toBeOnTheScreen(),
    );
    await fireEvent.press(screen.getByRole("button", { name: /Notificaciones/ }));
    await waitFor(() =>
      expect(
        screen.getByText("Nuevo pago en efectivo confirmado para Lucía Fernández."),
      ).toBeOnTheScreen(),
    );
    await fireEvent.press(
      screen.getByText("Nuevo pago en efectivo confirmado para Lucía Fernández."),
    );

    await waitFor(() => expect(screen.getByLabelText("Lucía Fernández")).toBeOnTheScreen());
    expect(
      screen.queryByText("Nuevo pago en efectivo confirmado para Lucía Fernández."),
    ).toBeNull();
  });
});
