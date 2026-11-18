import { clearMobileQueryCache } from "@pilates/mobile-core";
import { cleanup, waitFor } from "@testing-library/react-native";

import { jsonResponse } from "../test-support";
import { assistantRoutes, invitation, lucia, openLucia, overview } from "./assistant-fixtures";

jest.setTimeout(20_000);

// The test clock is 2026-10-08 10:00 in La Paz.
const pendingLucia = (phone: string | null, activationExpiresAt: string) => {
  const client = { ...lucia, phone, accountStatus: "pending" };
  return {
    ...assistantRoutes(),
    "/api/v1/assistant/clients?query=luc": () => jsonResponse([client]),
    "/api/v1/assistant/clients/client-lucia": () => jsonResponse({ ...overview, client }),
    "/api/v1/assistant/client-invitations/client-lucia": () =>
      jsonResponse({ ...invitation, clientId: lucia.id, activationExpiresAt }),
  };
};

describe("Client file header", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  // Walkthrough finding 95 (a): the admin web marks it since finding 74.
  it("marks a stored phone that fits no mobile instead of showing its digits", async () => {
    const screen = await openLucia(pendingLucia("7000004", "2026-10-14T15:00:00.000Z"));

    expect(screen.getByText("Celular incompleto")).toBeOnTheScreen();
    expect(screen.getByText(/lucia@example\.com/)).toBeOnTheScreen();
    expect(screen.queryByText(/7000004/)).toBeNull();
  });

  it("marks a Client without a phone the same way", async () => {
    const screen = await openLucia(pendingLucia(null, "2026-10-14T15:00:00.000Z"));

    expect(screen.getByText("Celular incompleto")).toBeOnTheScreen();
  });

  it("keeps a complete phone with its flag", async () => {
    const screen = await openLucia(pendingLucia("+591 70011001", "2026-10-14T15:00:00.000Z"));

    expect(screen.getByText(/🇧🇴 \+591 70011001/)).toBeOnTheScreen();
    expect(screen.queryByText("Celular incompleto")).toBeNull();
  });

  // Walkthrough finding 95 (b).
  it("says a link still valid expires and a lapsed one expired", async () => {
    const valid = await openLucia(pendingLucia("+591 70011001", "2026-10-14T15:00:00.000Z"));
    await waitFor(() =>
      expect(valid.getByText("El enlace vence el 14 de octubre de 2026")).toBeOnTheScreen(),
    );
    await cleanup();
    clearMobileQueryCache();

    const lapsed = await openLucia(pendingLucia("+591 70011001", "2026-09-29T15:00:00.000Z"));
    await waitFor(() =>
      expect(lapsed.getByText("El enlace venció el 29 de septiembre de 2026")).toBeOnTheScreen(),
    );
    expect(lapsed.getByRole("button", { name: "Reenviar enlace" })).toBeOnTheScreen();
  });
});
