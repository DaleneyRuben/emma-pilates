import { cleanup, fireEvent, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";
import { openProfile, readRoutes } from "./profile-test-support";

jest.setTimeout(20_000);

const label = "Recibir promociones de Emma Pilates";
const consentPath = "/api/v1/clients/current/promotions-consent";

const consent = (consented: boolean) => ({
  consented,
  consentedAt: consented ? "2026-10-01T12:00:00.000Z" : null,
});

const openWith = (routes: Record<string, (init?: RequestInit) => Response>) =>
  openProfile(createClientRuntime(routeFetcher({ ...readRoutes, ...routes })));

const sentBody = (request: jest.Mock) =>
  JSON.parse(String((request.mock.calls[0] as unknown as [RequestInit])[0].body)) as unknown;

// Follow-up 103 (ADR-0098): a live Client agrees to promotions, or stops,
// from Perfil; nothing turns the switch on for her.
describe("Perfil promotions switch", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("turns the promotions consent on", async () => {
    const set = jest.fn(() => jsonResponse(consent(true)));
    const screen = await openWith({
      [consentPath]: () => jsonResponse(consent(false)),
      [`PUT ${consentPath}`]: set,
    });

    await waitFor(() => {
      expect(screen.getByRole("switch", { name: label, checked: false })).toBeOnTheScreen();
    });
    expect(
      screen.getByText(
        "Usamos tu nombre, correo y teléfono para enviarte ofertas y novedades del estudio. Puedes desactivarlo cuando quieras.",
      ),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("switch", { name: label }));

    await waitFor(() => {
      expect(screen.getByRole("switch", { name: label, checked: true })).toBeOnTheScreen();
    });
    expect(sentBody(set)).toEqual({ consented: true });
  });

  it("turns the promotions consent off", async () => {
    const set = jest.fn(() => jsonResponse(consent(false)));
    const screen = await openWith({
      [consentPath]: () => jsonResponse(consent(true)),
      [`PUT ${consentPath}`]: set,
    });

    await waitFor(() => {
      expect(screen.getByRole("switch", { name: label, checked: true })).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("switch", { name: label }));

    await waitFor(() => {
      expect(screen.getByRole("switch", { name: label, checked: false })).toBeOnTheScreen();
    });
    expect(sentBody(set)).toEqual({ consented: false });
  });

  it("puts the switch back and says so when the change cannot be saved", async () => {
    const screen = await openWith({
      [consentPath]: () => jsonResponse(consent(false)),
      [`PUT ${consentPath}`]: () => jsonResponse({ code: "internal_error", status: 500 }, 500),
    });

    await waitFor(() => {
      expect(screen.getByRole("switch", { name: label, checked: false })).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("switch", { name: label }));

    await waitFor(() => {
      expect(
        screen.getByText("No pudimos guardar tu preferencia. Inténtalo de nuevo."),
      ).toBeOnTheScreen();
    });
    expect(screen.getByRole("switch", { name: label, checked: false })).toBeOnTheScreen();
  });
});
