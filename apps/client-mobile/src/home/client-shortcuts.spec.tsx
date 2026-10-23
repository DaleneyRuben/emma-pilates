import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(30_000);

const profile = {
  id: "client-1",
  name: "Lucía Fernández",
  email: "lucia@example.com",
  phone: null,
  referralCode: "REF-LUCIA",
};

const active = {
  status: "active",
  subscription: {
    id: "subscription-1",
    planName: "Paquete de 8 clases",
    originalClassAllowance: 8,
    remainingClassAllowance: 5,
    startsOn: "2026-09-11",
    endsOn: "2026-10-11",
  },
};

const upcoming = {
  id: "evaluation-1",
  slotId: "slot-1",
  state: "booked",
  startsAt: "2099-10-02T13:00:00.000Z",
  endsAt: "2099-10-02T13:45:00.000Z",
  durationMinutes: 45,
  branchId: "branch-centro",
  branchName: "Centro",
  nutritionistName: "Gabriela Flores",
  cancellableUntil: "2099-10-02T10:00:00.000Z",
  cancellable: true,
};

const page = (items: unknown[]) => ({ items, hasMore: false, nextCursor: null });

const notification = (id: string, destinationType: string, message: string) => ({
  id,
  category: "booking_schedule",
  type: "aviso",
  title: "Aviso",
  message,
  destinationType,
  destinationId: `${destinationType}-1`,
  createdAt: new Date(Date.now() - 60_000).toISOString(),
  readAt: null,
});

function routes(overrides: Parameters<typeof routeFetcher>[0] = {}) {
  return {
    "/api/v1/clients/current": () => jsonResponse(profile),
    "/api/v1/clients/current/subscription": () => jsonResponse(active),
    "/api/v1/clients/current/credit": () =>
      jsonResponse({ availableCentavos: 0, reservedCentavos: 0 }),
    "/api/v1/clients/current/referrals": () =>
      jsonResponse({
        referralCode: "REF-LUCIA",
        referrals: [
          {
            referredClientId: "client-ana",
            referredName: "Ana R.",
            state: "awarded",
            createdAt: "2026-09-01T12:00:00.000Z",
            awardedAt: "2026-09-05T12:00:00.000Z",
            awardCentavos: 6000,
          },
          {
            referredClientId: "client-bea",
            referredName: "Bea S.",
            state: "pending",
            createdAt: "2026-09-02T12:00:00.000Z",
            awardedAt: null,
            awardCentavos: null,
          },
        ],
      }),
    "/api/v1/evaluations?scope=upcoming": () => jsonResponse(page([upcoming])),
    "/api/v1/evaluations?scope=past": () => jsonResponse(page([])),
    "/api/v1/evaluation-slots": () => jsonResponse({ days: [], months: [] }),
    "/api/v1/bookings": () => jsonResponse([]),
    "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 2 }),
    "/api/v1/notifications?limit=50": () =>
      jsonResponse(
        page([
          notification("n1", "evaluation", "El estudio canceló tu evaluación nutricional."),
          notification("n2", "session", "Tu clase de Reformer Pilates fue cancelada."),
        ]),
      ),
    ...overrides,
  };
}

async function openApp(fetcher: typeof globalThis.fetch) {
  const screen = await render(<App runtime={createClientRuntime(fetcher)} />);
  await waitFor(
    () => {
      expect(screen.getByText("Hola, Lucía")).toBeOnTheScreen();
    },
    { timeout: 10_000 },
  );
  return screen;
}

describe("Client Home quick actions and notification destinations", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("shows the Evaluation and Referral quick actions with their summaries", async () => {
    const screen = await openApp(routeFetcher(routes()));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Evaluación nutricional: Próxima: 2 de octubre" }),
      ).toBeOnTheScreen();
    });
    expect(
      screen.getByRole("button", { name: "Invita a una amiga: 2 amigas invitadas" }),
    ).toBeOnTheScreen();

    await fireEvent.press(
      screen.getByRole("button", { name: "Evaluación nutricional: Próxima: 2 de octubre" }),
    );
    await waitFor(() => {
      expect(screen.getByText("Mis evaluaciones")).toBeOnTheScreen();
    });
  });

  it("invites a first Evaluation and Referral when there are none", async () => {
    const screen = await openApp(
      routeFetcher(
        routes({
          "/api/v1/evaluations?scope=upcoming": () => jsonResponse(page([])),
          "/api/v1/clients/current/referrals": () =>
            jsonResponse({ referralCode: "REF-LUCIA", referrals: [] }),
        }),
      ),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Evaluación nutricional: Agenda tu cita del mes" }),
      ).toBeOnTheScreen();
    });
    expect(
      screen.getByRole("button", { name: "Invita a una amiga: Invita a una amiga a una clase gratis" }),
    ).toBeOnTheScreen();

    await fireEvent.press(
      screen.getByRole("button", { name: "Evaluación nutricional: Agenda tu cita del mes" }),
    );
    await waitFor(() => {
      expect(screen.getByText("Evaluación nutricional")).toBeOnTheScreen();
    });
  });

  it("opens Mis evaluaciones and Mis reservas from their notifications", async () => {
    const screen = await openApp(routeFetcher(routes()));
    await fireEvent.press(screen.getByRole("button", { name: /^Perfil, .*tab/ }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Notificaciones" })).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: "Notificaciones" }));
    await waitFor(() => {
      expect(screen.getByText("El estudio canceló tu evaluación nutricional.")).toBeOnTheScreen();
    });

    await fireEvent.press(screen.getByText("El estudio canceló tu evaluación nutricional."));
    await waitFor(() => {
      expect(screen.getByText("Mis evaluaciones")).toBeOnTheScreen();
    });

    await fireEvent.press(screen.getByRole("button", { name: "Volver" }));
    await waitFor(() => {
      expect(screen.getByText("Tu clase de Reformer Pilates fue cancelada.")).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByText("Tu clase de Reformer Pilates fue cancelada."));
    await waitFor(() => {
      expect(screen.getByText("Mis reservas")).toBeOnTheScreen();
    });
  });
});
