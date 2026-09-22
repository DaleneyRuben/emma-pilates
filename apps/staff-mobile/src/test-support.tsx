import type { AppRole } from "@pilates/mobile-core";

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

type Route = (init?: RequestInit) => Response;

export function routeFetcher(
  routes: Record<string, Route>,
): jest.Mock & typeof globalThis.fetch {
  return jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const path = typeof input === "string" ? input : input.toString();
    const method = init?.method?.toUpperCase() ?? "GET";
    const bare = path.split("?")[0] ?? path;
    const route =
      routes[`${method} ${path}`] ??
      routes[path] ??
      routes[`${method} ${bare}`] ??
      routes[bare];
    return Promise.resolve(
      route === undefined
        ? jsonResponse({ code: "not_found", status: 404 }, 404)
        : route(init),
    );
  }) as unknown as jest.Mock & typeof globalThis.fetch;
}

export function createStaffRuntime(
  fetcher: typeof globalThis.fetch,
  role: Exclude<AppRole, "client"> = "trainer",
) {
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
      restore: jest.fn().mockResolvedValue({ accountId: "account-1", role }),
      start: jest.fn(),
      unlockWithBiometrics: jest.fn(),
    },
  };
}
