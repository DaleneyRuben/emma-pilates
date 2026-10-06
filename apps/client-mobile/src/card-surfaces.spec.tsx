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
  afterEach(() => {
    cleanup();
    clearMobileQueryCache();
  });

  it("draws Inicio's plan card with the frames' border and radius", async () => {
    const fetcher = routeFetcher({
      "/api/v1/clients/current": () => jsonResponse(profile),
      "/api/v1/clients/current/subscription": () => jsonResponse(activeSubscription),
    });
    const screen = await render(<App runtime={createClientRuntime(fetcher)} />);

    await waitFor(() => {
      expect(screen.getByText("Tu plan")).toBeOnTheScreen();
    });
    expect(screen.getByText("Tu plan").parent?.parent).toHaveStyle({
      backgroundColor: "#FFFFFF",
      borderColor: "#D8C9BB",
      borderRadius: 16,
      borderWidth: 1,
      shadowOpacity: 0.05,
    });
  });
});
