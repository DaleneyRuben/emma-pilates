import { cleanup, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../App";
import { createClientRuntime, jsonResponse, routeFetcher } from "./test-support";

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

// MOB-039: the Client frames draw every card on Blanco with a 1 px Borde
// fuerte and radius 16; Inicio's plan card stands for them.
describe("Client card surfaces (MOB-039)", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  // Rosa Emma C02: the Plan is a 500 count block beside a white card.
  it("draws Inicio's plan as a white card at radius 20 beside the medio count", async () => {
    const fetcher = routeFetcher({
      "/api/v1/clients/current": () => jsonResponse(profile),
      "/api/v1/clients/current/subscription": () => jsonResponse(activeSubscription),
    });
    const screen = await render(<App runtime={createClientRuntime(fetcher)} />);

    await waitFor(() => {
      expect(screen.getByTestId("home-plan-card")).toBeOnTheScreen();
    });
    expect(screen.getByTestId("home-plan-summary")).toHaveStyle({
      backgroundColor: "#FFFBFB",
      borderRadius: 20,
    });
    expect(screen.getByTestId("home-plan-count")).toHaveStyle({
      backgroundColor: "#B78380",
      borderRadius: 20,
    });
  });
});
