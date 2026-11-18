import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(20_000);

const plans = [
  {
    id: "plan-8",
    name: "Paquete de 8 clases",
    durationDays: 30,
    weeklyClassCap: null,
    durationMonths: 1,
    classAllowance: 8,
    priceCentavos: 56_000,
  },
  {
    id: "plan-24",
    name: "Trimestral 24 clases",
    durationDays: 90,
    weeklyClassCap: 3,
    durationMonths: 3,
    classAllowance: 24,
    priceCentavos: 180_000,
  },
];

// FIX-082 (walkthrough of the design audit, 2026-11-18): «Elige tu plan»
// marks the Plan she has now.
describe("Client Plans with a current Plan", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("marks the Client's current Plan", async () => {
    const screen = await render(
      <App
        runtime={createClientRuntime(
          routeFetcher({
            "/api/v1/clients/current": () =>
              jsonResponse({ id: "client-1", name: "Carla Ríos", email: "carla@example.com" }),
            "/api/v1/clients/current/subscription": () =>
              jsonResponse({
                status: "active",
                subscription: {
                  id: "subscription-1",
                  planName: "Trimestral 24 clases",
                  originalClassAllowance: 24,
                  remainingClassAllowance: 20,
                  startsOn: "2026-11-08",
                  endsOn: "2027-02-08",
                },
                nextSubscription: null,
              }),
            "/api/v1/plans": () => jsonResponse(plans),
          }),
        )}
      />,
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /^Mi plan, / })).toBeOnTheScreen(),
    );
    await fireEvent.press(screen.getByRole("button", { name: /^Mi plan, / }));
    await fireEvent.press(await screen.findByRole("button", { name: "Renovar mi plan" }));

    const current = await screen.findByTestId("plan-card-plan-24");
    expect(within(current).getByText("Tu plan actual")).toBeOnTheScreen();
    expect(current).toHaveProp("accessibilityLabel", expect.stringMatching(/tu plan actual$/));
    expect(within(screen.getByTestId("plan-card-plan-8")).queryByText("Tu plan actual")).toBeNull();
  });
});
