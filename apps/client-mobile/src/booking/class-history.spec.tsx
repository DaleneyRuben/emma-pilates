import {
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(20_000);

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

const history = [
  {
    bookingId: "booking-3",
    sessionId: "session-3",
    classTypeName: "Mat Pilates",
    trainerName: "Daniela Ortiz",
    branchName: "Urubó",
    startsAt: "2026-09-05T13:00:00.000Z",
    endsAt: "2026-09-05T13:50:00.000Z",
  },
  {
    bookingId: "booking-2",
    sessionId: "session-2",
    classTypeName: "Reformer Pilates",
    trainerName: "Emma Vargas",
    branchName: "Centro",
    startsAt: "2026-08-26T11:00:00.000Z",
    endsAt: "2026-08-26T11:50:00.000Z",
  },
  {
    bookingId: "booking-1",
    sessionId: "session-1",
    classTypeName: "Reformer Pilates",
    trainerName: "Emma Vargas",
    branchName: "Centro",
    startsAt: "2026-08-19T11:00:00.000Z",
    endsAt: "2026-08-19T11:50:00.000Z",
  },
];

async function openHistory(entries: unknown[]) {
  const screen = await render(
    <App
      runtime={createClientRuntime(
        routeFetcher({
          "/api/v1/clients/current": () => jsonResponse(profile),
          "/api/v1/clients/current/subscription": () => jsonResponse(active),
          "/api/v1/bookings": () => jsonResponse([]),
          "/api/v1/bookings/history": () => jsonResponse(entries),
        }),
      )}
    />,
  );

  await waitFor(
    () => {
      expect(
        screen.getByRole("button", { name: /Mis Reservas, tab/ }),
      ).toBeOnTheScreen();
    },
    { timeout: 10_000 },
  );
  fireEvent.press(screen.getByRole("button", { name: /Mis Reservas, tab/ }));
  await waitFor(
    () => {
      expect(screen.getByRole("button", { name: "Ver historial" })).toBeOnTheScreen();
    },
    { timeout: 5_000 },
  );
  fireEvent.press(screen.getByRole("button", { name: "Ver historial" }));
  await waitFor(() => {
    expect(screen.getByText("Historial de clases")).toBeOnTheScreen();
  });

  return screen;
}

describe("Client Class History", () => {
  afterEach(() => {
    cleanup();
    clearMobileQueryCache();
  });

  it("groups attended classes by month, newest first", async () => {
    const screen = await openHistory(history);

    await waitFor(() => {
      expect(screen.getByText("Septiembre 2026")).toBeOnTheScreen();
    });
    expect(screen.getByText("Agosto 2026")).toBeOnTheScreen();
    expect(screen.getByText("Mat Pilates")).toBeOnTheScreen();
    expect(screen.getAllByText("Reformer Pilates")).toHaveLength(2);
    expect(screen.getByText("Daniela Ortiz · Urubó")).toBeOnTheScreen();
    expect(screen.getByText("sábado 5 de septiembre")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Cancelar" })).not.toBeOnTheScreen();
  });

  it("shows a calm empty state", async () => {
    const screen = await openHistory([]);

    await waitFor(() => {
      expect(
        screen.getByText("Aún no tienes clases en tu historial."),
      ).toBeOnTheScreen();
    });
  });
});
