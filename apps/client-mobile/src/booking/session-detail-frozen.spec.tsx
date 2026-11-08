import { cleanup } from "@testing-library/react-native";
import { addCivilDays, boliviaCivilDate, clearMobileQueryCache } from "@pilates/mobile-core";

import { jsonResponse } from "../test-support";
import { openDetail, startsAt, subscription } from "./session-detail-test-support";

jest.setTimeout(20_000);

// Walkthrough finding 53 (owner 2026-11-08): on a day the Client's plan is
// frozen, the class detail turns Reservar off and says so before she taps,
// like «Necesitas un plan para reservar.»; the waitlist too.
const classDay = boliviaCivilDate(startsAt);
const frozen = (startsOn: string, endsOn: string) => ({
  "/api/v1/clients/current/subscription": () =>
    jsonResponse({
      ...subscription(5),
      freeze: { id: "freeze-1", state: "approved", startsOn, endsOn },
      canRequestFreeze: false,
    }),
});

describe("Client Session detail on a frozen day", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("turns Reservar off and names the frozen days", async () => {
    const { screen } = await openDetail(
      frozen(addCivilDays(classDay, -1), addCivilDays(classDay, 2)),
    );

    expect(screen.getByText(/^Tu plan está congelado ese día/)).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Reservar" })).toBeDisabled();
    expect(screen.queryByText("Se descuenta 1 clase de tu plan")).toBeNull();
  });

  it("closes the waitlist of a full class on a frozen day", async () => {
    const { screen } = await openDetail(frozen(classDay, classDay), 5, 0);

    expect(screen.getByText(/^Tu plan está congelado ese día/)).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Unirme a la lista de espera" })).toBeNull();
  });

  it("books as usual outside the frozen days", async () => {
    const { screen } = await openDetail(
      frozen(addCivilDays(classDay, 1), addCivilDays(classDay, 3)),
    );

    expect(screen.getByRole("button", { name: "Reservar" })).toBeEnabled();
    expect(screen.queryByText(/congelado/)).toBeNull();
  });
});
