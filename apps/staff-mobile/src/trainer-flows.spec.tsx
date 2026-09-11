import {
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../App";

const session = {
  bookedCount: 6,
  branchName: "Sopocachi",
  capacity: 8,
  classTypeName: "Reformer Pilates",
  endsAt: "2026-09-10T15:00:00.000Z",
  sessionId: "session-1",
  startsAt: "2026-09-10T14:00:00.000Z",
};

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
}

function createRuntime(fetcher: typeof globalThis.fetch) {
  return {
    allowedLinkHosts: ["links.emmapilates.test"],
    apiFetcher: fetcher,
    authenticationApi: {
      activateAccount: jest.fn(),
      cancelRegistration: jest.fn(),
      completePasswordRecovery: jest.fn(),
      correctRegistrationEmail: jest.fn(),
      inspectLink: jest.fn(),
      register: jest.fn(),
      requestPasswordRecovery: jest.fn(),
      resendRegistrationVerification: jest.fn(),
      verifyClientEmail: jest.fn(),
    },
    linkSource: {
      addEventListener: () => ({ remove: jest.fn() }),
      getInitialURL: async () => null,
    },
    login: jest.fn(),
    sessionManager: {
      hasBiometricSession: jest.fn().mockResolvedValue(false),
      logout: jest.fn(),
      restore: jest
        .fn()
        .mockResolvedValue({ accountId: "account-1", role: "trainer" }),
      start: jest.fn(),
      unlockWithBiometrics: jest.fn(),
    },
  };
}

describe("Trainer agenda and attendance", () => {
  afterEach(() => {
    cleanup();
    clearMobileQueryCache();
  });

  it("shows a Session, restores saved outcomes, and saves a correction", async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse([session]))
      .mockResolvedValueOnce(
        jsonResponse({
          ...session,
          endsAt: "2000-09-10T11:00:00.000Z",
          bookings: [
            {
              bookingId: "booking-1",
              clientName: "Ana Pérez",
              attendanceOutcome: "attended",
            },
            {
              bookingId: "booking-2",
              clientName: "Luis Flores",
              attendanceOutcome: "no_show",
            },
          ],
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 201 }));
    const screen = await render(<App runtime={createRuntime(fetcher)} />);

    await waitFor(() => {
      expect(screen.getByText("Reformer Pilates")).toBeOnTheScreen();
      expect(screen.getByText("6 de 8 reservados")).toBeOnTheScreen();
    });
    fireEvent.press(screen.getByRole("button", { name: "Reformer Pilates" }));

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Ana Pérez: Asistió" }),
      ).toHaveProp("accessibilityState", { selected: true }),
    );
    fireEvent.press(
      screen.getByRole("button", { name: "Luis Flores: Asistió" }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Luis Flores: Asistió" }),
      ).toHaveProp("accessibilityState", { selected: true }),
    );
    fireEvent.press(screen.getByRole("button", { name: "Guardar asistencia" }));

    await waitFor(() => {
      expect(fetcher).toHaveBeenLastCalledWith(
        "/api/v1/sessions/session-1/attendance",
        expect.objectContaining({
          body: JSON.stringify({
            outcomes: [
              { bookingId: "booking-1", outcome: "attended" },
              { bookingId: "booking-2", outcome: "attended" },
            ],
          }),
        }),
      );
      expect(screen.getByText("Asistencia guardada.")).toBeOnTheScreen();
    });
  });
});
