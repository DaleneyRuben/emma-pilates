import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";

const plan = {
  id: "plan-24",
  name: "Trimestral 24 clases",
  durationDays: 90,
  weeklyClassCap: null,
  durationMonths: 3,
  classAllowance: 24,
  priceCentavos: 180_000,
};

const branch = (id: string, name: string) => ({ id, name, address: `${name} 1` });

// Walkthrough finding 50: «en cualquier sucursal» only means something when
// the studio has more than one active Branch.
async function openPlanDetail(branches: unknown[]) {
  const fetcher = routeFetcher({
    "/api/v1/clients/current": () =>
      jsonResponse({ id: "client-1", name: "Carla Ríos", email: "carla@example.com" }),
    "/api/v1/clients/current/subscription": () =>
      jsonResponse({ status: "none", subscription: null }),
    "/api/v1/plans": () => jsonResponse([plan]),
    "/api/v1/plans/plan-24": () => jsonResponse(plan),
    "/api/v1/branches": () => jsonResponse(branches),
  });
  const screen = await render(<App runtime={createClientRuntime(fetcher)} />);
  await waitFor(() => {
    expect(screen.getByRole("button", { name: "Comprar un plan" })).toBeOnTheScreen();
  });
  await fireEvent.press(screen.getByRole("button", { name: "Comprar un plan" }));
  await waitFor(() => {
    expect(screen.getByRole("button", { name: /^Trimestral 24 clases,/ })).toBeOnTheScreen();
  });
  await fireEvent.press(screen.getByRole("button", { name: /^Trimestral 24 clases,/ }));
  await waitFor(() => {
    expect(screen.getByText("Válido por 90 días")).toBeOnTheScreen();
  });
  return screen;
}

describe("Plan detail «Qué incluye» and the Branches", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("says only the classes when the studio has one Branch", async () => {
    const screen = await openPlanDetail([branch("b-1", "Achumani")]);

    await waitFor(() => {
      expect(screen.getByText("24 clases")).toBeOnTheScreen();
    });
    expect(screen.queryByText(/cualquier sucursal/)).toBeNull();
  });

  it("says any Branch when the studio has two or more", async () => {
    const screen = await openPlanDetail([branch("b-1", "Achumani"), branch("b-2", "Sopocachi")]);

    await waitFor(() => {
      expect(screen.getByText("24 clases en cualquier sucursal")).toBeOnTheScreen();
    });
  });
});
