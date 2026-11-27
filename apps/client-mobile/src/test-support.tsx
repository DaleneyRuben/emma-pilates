import type { render } from "@testing-library/react-native";
import type { MobileRuntime } from "@pilates/mobile-core";
import { StyleSheet } from "react-native";
import { noBiometrics } from "@pilates/mobile-core/testing";

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

type Route = (init?: RequestInit) => Response;

// The Studio Settings in force today (BKM-004), answered unless a spec routes
// `/api/v1/studio-rules` itself.
export const studioRules = {
  cancellationWindowMinutes: 150,
  evaluationPriceCentavos: 7_000,
  plansFromPriceCentavos: 56_000,
  startDateLimitDays: 14,
  openingDate: null,
  bookingWindowDays: 7,
};

const defaultRoutes: Record<string, Route> = {
  "/api/v1/studio-rules": () => jsonResponse(studioRules),
};

export function routeFetcher(routes: Record<string, Route>): typeof globalThis.fetch {
  return jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const path = typeof input === "string" ? input : input.toString();
    const method = init?.method?.toUpperCase() ?? "GET";
    const route = routes[`${method} ${path}`] ?? routes[path] ?? defaultRoutes[path];
    return Promise.resolve(
      route === undefined ? jsonResponse({ code: "not_found", status: 404 }, 404) : route(init),
    );
  }) as unknown as typeof globalThis.fetch;
}

export function createClientRuntime(
  fetcher: typeof globalThis.fetch,
  overrides: Pick<MobileRuntime, "installationIdentifier" | "pushPlatform"> = {},
) {
  return {
    allowedLinkHosts: ["links.emmapilates.test"],
    linkIdentityKind: "client" as const,
    apiBaseUrl: "https://api.test/api/v1",
    apiFetcher: fetcher,
    authenticationApi: {
      activateAccount: jest.fn(),
      cancelRegistration: jest.fn(),
      completeEmailChange: jest.fn(),
      completePasswordRecovery: jest.fn(),
      correctRegistrationEmail: jest.fn(),
      inspectLink: jest.fn(),
      lookUpReferralCode: jest.fn(),
      readRegistrationStatus: jest.fn().mockResolvedValue("pending"),
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
      ...noBiometrics,
      endLocally: jest.fn(),
      refresh: jest.fn().mockResolvedValue(null),
      hasBiometricSession: jest.fn().mockResolvedValue(false),
      logout: jest.fn(),
      restore: jest.fn().mockResolvedValue({ accountId: "account-1", role: "client" }),
      start: jest.fn(),
      unlockWithBiometrics: jest.fn().mockResolvedValue({ status: "cancelled" }),
    },
    ...overrides,
  };
}

// FIX-041: a Staff Member's photo thumbnail, served by asset as the API does.
export function staffPhotoRoute(imageAssetId: string): Record<string, Route> {
  return {
    [`/api/v1/staff-photos/${imageAssetId}?variant=thumbnail`]: () =>
      new Response(Uint8Array.from([255, 216, 255, 224]), {
        headers: { "Content-Type": "image/jpeg" },
        status: 200,
      }),
  };
}

type Element = ReturnType<Awaited<ReturnType<typeof render>>["getByText"]>;

/**
 * Every background drawn behind an element, itself first: palette B says a
 * normal state in words, so its text sits on no pill (FIX-089).
 */
export function ancestorBackgrounds(element: Element): unknown[] {
  const found: unknown[] = [];
  for (let node: Element | null = element; node !== null; node = node.parent) {
    const style = StyleSheet.flatten(node.props.style as never) as
      { backgroundColor?: unknown } | undefined;
    if (style?.backgroundColor !== undefined) found.push(style.backgroundColor);
  }
  return found;
}
