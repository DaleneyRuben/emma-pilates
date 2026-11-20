import { cleanup } from "@testing-library/react-native";
import { formatListDate } from "@pilates/api-contracts";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { jsonResponse } from "../test-support";
import { assistantRoutes, openLucia, overview, today } from "./assistant-fixtures";

jest.setTimeout(20_000);

const civilIn = (days: number) => {
  const date = new Date(`${today}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const withFreeze = (freeze: { state: string; startsOn: string; endsOn: string }) => ({
  ...assistantRoutes(),
  "/api/v1/assistant/clients/client-lucia": () =>
    jsonResponse({
      ...overview,
      subscription: { ...overview.subscription, freeze: { id: "freeze-1", ...freeze } },
    }),
});

// FIX-090 (audit C3): front desk sees why a day cannot be booked.
describe("the plan card names the plan's Freeze", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("names an approved Freeze that has not ended", async () => {
    const startsOn = civilIn(2);
    const endsOn = civilIn(4);
    const screen = await openLucia(withFreeze({ state: "approved", startsOn, endsOn }));

    // Staff pick E4 A: the Freeze on its own row.
    expect(
      screen.getByText(`Congelado del ${formatListDate(startsOn)} al ${formatListDate(endsOn)}`),
    ).toBeOnTheScreen();
    expect(screen.getByText("Aprobado · no puede reservar esos días")).toBeOnTheScreen();
  });

  it("names a Freeze still in review", async () => {
    const startsOn = civilIn(5);
    const endsOn = civilIn(7);
    const screen = await openLucia(withFreeze({ state: "requested", startsOn, endsOn }));

    expect(
      screen.getByText(
        `Pidió congelar del ${formatListDate(startsOn)} al ${formatListDate(endsOn)}`,
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText("Está por revisar")).toBeOnTheScreen();
  });

  it("says nothing of a Freeze that ended, was refused or was withdrawn", async () => {
    for (const freeze of [
      { state: "approved", startsOn: civilIn(-5), endsOn: civilIn(-3) },
      { state: "refused", startsOn: civilIn(2), endsOn: civilIn(4) },
      { state: "withdrawn", startsOn: civilIn(2), endsOn: civilIn(4) },
    ]) {
      const screen = await openLucia(withFreeze(freeze));
      expect(screen.queryByText(/^Congelado del|^Pidió congelar/)).toBeNull();
      await cleanup();
      clearMobileQueryCache();
    }
  });
});
