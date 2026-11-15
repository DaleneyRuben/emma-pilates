import { cleanup, fireEvent, waitFor } from "@testing-library/react-native";
import { addCivilDays, boliviaCivilDate, clearMobileQueryCache } from "@pilates/mobile-core";

import { baseRoutes, intent, openPlanDetail } from "../payments/purchase-test-support";
import { jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(30_000);

const rule =
  "Tienes una clase reservada con tu acceso actual. Elige un inicio después de esa clase.";
const today = boliviaCivilDate(new Date());
const classDay = addCivilDays(today, 1);
const firstValidDay = addCivilDays(today, 2);

// Elena booked her guest class for tomorrow at 16:00 in La Paz.
const guestPassWithClass = {
  status: "active",
  subscription: {
    id: "subscription-guest",
    planName: "Pase de invitada",
    originalClassAllowance: 1,
    remainingClassAllowance: 0,
    startsOn: today,
    endsOn: addCivilDays(today, 29),
    extraClassesLine: null,
    guestPass: { usedClassStartsAt: `${classDay}T20:00:00.000Z` },
  },
};

function guestFetcher(onPurchase: (body: unknown) => void = () => undefined) {
  return routeFetcher({
    ...baseRoutes(0),
    "/api/v1/clients/current/subscription": () => jsonResponse(guestPassWithClass),
    "POST /api/v1/purchase-intents": (init) => {
      onPurchase(JSON.parse(String(init?.body)));
      return jsonResponse(intent, 201);
    },
  });
}

// Walkthrough n.º 58: a plan cannot start on or before the booked guest
// class, so Elige tu plan opens on the first day it can start and states the
// rule as help, not as an error.
describe("Elige tu plan with a booked guest class", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("preselects the day after the class and explains why", async () => {
    const purchased = jest.fn();
    const screen = await openPlanDetail(guestFetcher(purchased));

    await waitFor(() => expect(screen.getByTestId(`start-date-${firstValidDay}`)).toBeSelected());
    expect(screen.getByTestId(`start-date-${today}`)).not.toBeSelected();
    expect(screen.getByText(rule)).toBeOnTheScreen();
    expect(screen.queryByRole("alert")).toBeNull();

    await fireEvent.press(screen.getByTestId("plan-continue-to-payment"));

    await waitFor(() =>
      expect(purchased).toHaveBeenCalledWith(expect.objectContaining({ startsOn: firstValidDay })),
    );
  });

  it("warns when she picks a day on or before the class", async () => {
    const screen = await openPlanDetail(guestFetcher());
    await waitFor(() => expect(screen.getByTestId(`start-date-${firstValidDay}`)).toBeSelected());

    await fireEvent.press(screen.getByTestId(`start-date-${classDay}`));

    expect(screen.getByRole("alert")).toHaveTextContent(rule);
  });
});
