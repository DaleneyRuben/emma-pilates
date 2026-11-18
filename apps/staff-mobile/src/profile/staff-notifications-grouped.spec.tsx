import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(30_000);

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

const feedback = (id: string, message: string, minutes: number, readAt: string | null = null) => ({
  id,
  category: "announcement",
  type: "feedback_received",
  title: "Comentario nuevo",
  message,
  destinationType: "feedback",
  destinationId: id,
  createdAt: minutesAgo(minutes),
  readAt,
});

const items = [
  feedback("f1", "Lucía escribió desde la app.", 5),
  {
    id: "p1",
    category: "subscription_payment",
    type: "payment_submitted",
    title: "Comprobante por revisar",
    message: "Carla Prueba subió un comprobante de Bs 450.",
    destinationType: "payment",
    destinationId: "22222222-2222-4222-8222-222222222222",
    createdAt: minutesAgo(10),
    readAt: null,
  },
  feedback("f2", "Valeria escribió desde la app.", 20),
  feedback("f3", "Ana escribió desde la app.", 90, minutesAgo(60)),
];

async function openNotifications() {
  const fetcher = routeFetcher({
    "/api/v1/staff-members/current": () =>
      jsonResponse({
        id: "staff-1",
        name: "Ana Torres",
        email: "ana@example.com",
        phone: null,
        role: "administrator",
        branches: [],
      }),
    "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 3 }),
    "/api/v1/notifications": () => jsonResponse({ items, hasMore: false, nextCursor: null }),
    "/api/v1/administrator/payments/pending": () => jsonResponse([]),
  });
  const screen = await render(<App runtime={createStaffRuntime(fetcher, "administrator")} />);
  await waitFor(() => expect(screen.getByTestId("tab-profile")).toBeOnTheScreen(), {
    timeout: 10_000,
  });
  await fireEvent.press(screen.getByTestId("tab-profile"));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: /Notificaciones/ })).toBeOnTheScreen(),
  );
  await fireEvent.press(screen.getByRole("button", { name: /Notificaciones/ }));
  await waitFor(() => expect(screen.getByText("3 comentarios")).toBeOnTheScreen());
  return { fetcher, screen };
}

describe("Staff Notificaciones grouped (FIX-083, pick A)", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("collapses the same kind of notice into one row in a single list", async () => {
    const { screen } = await openNotifications();

    expect(screen.getByText("Carla Prueba subió un comprobante de Bs 450.")).toBeOnTheScreen();
    expect(screen.getByText("Marcar todo leído")).toBeOnTheScreen();
    expect(screen.queryByText("Sin leer")).toBeNull();
    expect(screen.queryByText("Anteriores")).toBeNull();
    expect(screen.queryByText("Lucía escribió desde la app.")).toBeNull();
    expect(screen.getByRole("button", { name: /^3 comentarios, 2 sin leer/ })).toHaveProp(
      "accessibilityState",
      expect.objectContaining({ expanded: false }),
    );
  });

  it("opens a group to show each notice, and each one still opens its destination", async () => {
    const { screen } = await openNotifications();

    await fireEvent.press(screen.getByText("3 comentarios"));

    await waitFor(() => expect(screen.getByText("Lucía escribió desde la app.")).toBeOnTheScreen());
    expect(screen.getByText("Valeria escribió desde la app.")).toBeOnTheScreen();
    expect(screen.getByText("Ana escribió desde la app.")).toBeOnTheScreen();

    await fireEvent.press(screen.getByText("3 comentarios"));
    await waitFor(() => expect(screen.queryByText("Lucía escribió desde la app.")).toBeNull());
  });

  it("draws unread rows with a dot, not a tinted fill", async () => {
    const { screen } = await openNotifications();

    expect(screen.getAllByTestId("notification-unread-dot")).toHaveLength(2);
    expect(screen.getByTestId("notification-row-p1")).not.toHaveStyle({
      backgroundColor: "#F6EDEB",
    });
  });

  it("tells a screen reader which single notices are unread", async () => {
    const { screen } = await openNotifications();

    expect(
      screen.getByRole("button", {
        name: "Carla Prueba subió un comprobante de Bs 450., sin leer",
      }),
    ).toBeOnTheScreen();
    expect(screen.getByText(/^2 sin leer · /)).toBeOnTheScreen();
  });

  it("marks a notice read when opened and everything with «Marcar todo leído»", async () => {
    const { fetcher, screen } = await openNotifications();
    const posts = () =>
      (fetcher.mock.calls as [string, RequestInit | undefined][])
        .filter(([, init]) => init?.method?.toUpperCase() === "POST")
        .map(([path]) => path);

    await fireEvent.press(screen.getByText("Marcar todo leído"));
    await waitFor(() => expect(posts()).toContain("/api/v1/notifications/read-all"));

    await fireEvent.press(screen.getByText("Carla Prueba subió un comprobante de Bs 450."));
    await waitFor(() => expect(posts()).toContain("/api/v1/notifications/p1/read"));
  });
});
