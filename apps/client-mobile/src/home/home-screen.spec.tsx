import {
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";

const profile = {
  id: "client-1",
  name: "Lucía Fernández",
  email: "lucia@example.com",
  phone: "+591 70011001",
  referralCode: "REF-LUCIA",
};

const activeSubscription = {
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

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

function createFetcher(routes: Record<string, () => Response>) {
  return jest.fn((input: RequestInfo | URL) => {
    const path = typeof input === "string" ? input : input.toString();
    const route = routes[path];
    return Promise.resolve(
      route === undefined
        ? jsonResponse({ code: "not_found", status: 404 }, 404)
        : route(),
    );
  }) as unknown as typeof globalThis.fetch;
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
        .mockResolvedValue({ accountId: "account-1", role: "client" }),
      start: jest.fn(),
      unlockWithBiometrics: jest.fn(),
    },
  };
}

describe("Client Home", () => {
  afterEach(() => {
    cleanup();
    clearMobileQueryCache();
  });

  it("greets the Client and shows an active Subscription", async () => {
    const fetcher = createFetcher({
      "/api/v1/clients/current": () => jsonResponse(profile),
      "/api/v1/clients/current/subscription": () =>
        jsonResponse(activeSubscription),
    });
    const screen = await render(<App runtime={createRuntime(fetcher)} />);

    await waitFor(() => {
      expect(screen.getByText("Hola, Lucía")).toBeOnTheScreen();
    });
    expect(screen.getByText("Paquete de 8 clases")).toBeOnTheScreen();
    expect(screen.getByText("5 de 8 clases")).toBeOnTheScreen();
    expect(screen.getByText("Pagado hasta el 11 de octubre")).toBeOnTheScreen();
    expect(screen.getByText("Activa")).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Reservar una clase" }),
    ).toHaveProp("accessibilityState", { disabled: false });
  });

  it("warns when the Subscription is about to expire", async () => {
    const fetcher = createFetcher({
      "/api/v1/clients/current": () => jsonResponse(profile),
      "/api/v1/clients/current/subscription": () =>
        jsonResponse({ ...activeSubscription, status: "expiring_soon" }),
    });
    const screen = await render(<App runtime={createRuntime(fetcher)} />);

    await waitFor(() => {
      expect(screen.getByText("Por vencer")).toBeOnTheScreen();
    });
  });

  it("offers a Plan purchase and disables booking without an active Subscription", async () => {
    const fetcher = createFetcher({
      "/api/v1/clients/current": () => jsonResponse(profile),
      "/api/v1/clients/current/subscription": () =>
        jsonResponse({ status: "none", subscription: null }),
    });
    const screen = await render(<App runtime={createRuntime(fetcher)} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Comprar un plan" }),
      ).toBeOnTheScreen();
    });
    expect(
      screen.getByText("Necesitas un plan activo para reservar"),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Reservar una clase" }),
    ).toHaveProp("accessibilityState", { disabled: true });
    expect(screen.queryByText("Activa")).not.toBeOnTheScreen();
  });

  it("recovers from a failed load with a retry", async () => {
    let attempts = 0;
    const fetcher = createFetcher({
      "/api/v1/clients/current": () => jsonResponse(profile),
      "/api/v1/clients/current/subscription": () => {
        attempts += 1;
        return attempts === 1
          ? jsonResponse({ code: "unexpected_error", status: 500 }, 500)
          : jsonResponse(activeSubscription);
      },
    });
    const screen = await render(<App runtime={createRuntime(fetcher)} />);

    await waitFor(() => {
      expect(screen.getByText("No pudimos cargar tu inicio.")).toBeOnTheScreen();
    });
    fireEvent.press(screen.getByRole("button", { name: "Reintentar" }));

    await waitFor(() => {
      expect(screen.getByText("Paquete de 8 clases")).toBeOnTheScreen();
    });
  });
});
