export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

type Route = (init?: RequestInit) => Response;

export function routeFetcher(
  routes: Record<string, Route>,
): typeof globalThis.fetch {
  return jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const path = typeof input === "string" ? input : input.toString();
    const method = init?.method?.toUpperCase() ?? "GET";
    const route = routes[`${method} ${path}`] ?? routes[path];
    return Promise.resolve(
      route === undefined
        ? jsonResponse({ code: "not_found", status: 404 }, 404)
        : route(init),
    );
  }) as unknown as typeof globalThis.fetch;
}

export function createClientRuntime(fetcher: typeof globalThis.fetch) {
  return {
    allowedLinkHosts: ["links.emmapilates.test"],
    apiBaseUrl: "https://api.test/api/v1",
    apiFetcher: fetcher,
    authenticationApi: {
      activateAccount: jest.fn(),
      cancelRegistration: jest.fn(),
      completeEmailChange: jest.fn(),
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
      getInitialURL: async (): Promise<string | null> => null,
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
