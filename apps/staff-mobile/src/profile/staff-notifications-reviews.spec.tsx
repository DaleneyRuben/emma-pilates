import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(30_000);

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
const paymentId = "22222222-2222-4222-8222-222222222222";

const review = (
  outcome: "pending" | "approved",
  clientName: string,
  decidedByName: string | null = null,
) => ({
  subject: "payment",
  clientName,
  planName: "Trimestral 36 clases",
  amountCentavos: 186_200,
  startsOn: null,
  endsOn: null,
  outcome,
  decidedByName,
  decidedAt: decidedByName === null ? null : minutesAgo(15),
});

const items = [
  {
    id: "p1",
    category: "subscription_payment",
    type: "payment_submitted",
    title: "Comprobante por revisar",
    message: "Tienes un comprobante de pago pendiente de revisión.",
    destinationType: "payment",
    destinationId: paymentId,
    createdAt: minutesAgo(20),
    readAt: null,
    review: review("pending", "Ana Pérez"),
    feedback: null,
  },
  {
    id: "p2",
    category: "subscription_payment",
    type: "payment_submitted",
    title: "Comprobante por revisar",
    message: "Tienes un comprobante de pago pendiente de revisión.",
    destinationType: "payment",
    destinationId: "33333333-3333-4333-8333-333333333333",
    createdAt: minutesAgo(60),
    readAt: minutesAgo(15),
    review: review("approved", "Sofía Paredes", "Gabriela Rojas"),
    feedback: null,
  },
  {
    id: "c1",
    category: "booking_schedule",
    type: "session_cancelled",
    title: "Clase cancelada",
    message: "Se canceló Reformer Pilates del sáb 21 nov.",
    destinationType: null,
    destinationId: null,
    createdAt: minutesAgo(90),
    readAt: null,
    review: null,
    feedback: null,
  },
];

async function openNotifications() {
  const calls: string[] = [];
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
    "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 2 }),
    "/api/v1/notifications": () => jsonResponse({ items, hasMore: false, nextCursor: null }),
    "/api/v1/administrator/payments/pending": () => jsonResponse([]),
    "DELETE /api/v1/notifications/c1": () => {
      calls.push("DELETE c1");
      return new Response(null, { status: 204 });
    },
  });
  const screen = await render(<App runtime={createStaffRuntime(fetcher, "administrator")} />);
  await waitFor(() => expect(screen.getByTestId("tab-profile")).toBeOnTheScreen(), {
    timeout: 10_000,
  });
  await fireEvent.press(screen.getByTestId("tab-profile"));
  await fireEvent.press(await screen.findByRole("button", { name: /Notificaciones/ }));
  await waitFor(() => expect(screen.getByText("Por revisar")).toBeOnTheScreen());
  return { calls, screen };
}

// Walkthrough n.º 12 (E-F07) and n.º 10 (E-F15).
describe("Staff Notificaciones for the Administrator", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("lists pending reviews on top and decided ones below, dimmed and without a chevron", async () => {
    const { screen } = await openNotifications();

    expect(screen.getByText("Ana Pérez · Trimestral 36 clases · Bs 1.862")).toBeOnTheScreen();
    expect(screen.getByText("Comprobante por revisar")).toBeOnTheScreen();
    expect(screen.getByText("Ya revisados")).toBeOnTheScreen();
    expect(
      screen.getByText("Pago de Sofía Paredes aprobado por Gabriela · hace 15 minutos"),
    ).toBeOnTheScreen();
    expect(
      screen.queryByRole("button", { name: /Pago de Sofía Paredes aprobado/ }),
    ).not.toBeOnTheScreen();
    expect(screen.queryByText(/comprobantes recibidos/)).not.toBeOnTheScreen();
  });

  it("opens the payment review from a pending one", async () => {
    const { screen } = await openNotifications();

    await fireEvent.press(
      screen.getByRole("button", { name: /^Ana Pérez · Trimestral 36 clases · Bs 1.862/ }),
    );

    await waitFor(() => expect(screen.queryByText("Por revisar")).not.toBeOnTheScreen());
  });

  it("removes another notice with a swipe and offers «Deshacer»", async () => {
    const { calls, screen } = await openNotifications();

    await fireEvent.press(
      screen.getByTestId("notification-swipe-c1").findByProps({ accessibilityLabel: "Borrar" }),
    );

    await waitFor(() =>
      expect(screen.queryByText("Se canceló Reformer Pilates del sáb 21 nov.")).toBeNull(),
    );
    expect(screen.getByText("Notificación borrada")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Deshacer" })).toBeOnTheScreen();
    await waitFor(() => expect(calls).toEqual(["DELETE c1"]));
  });
});
