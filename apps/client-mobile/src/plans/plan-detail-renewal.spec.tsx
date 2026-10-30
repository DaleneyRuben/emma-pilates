import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { baseRoutes, intent } from "../payments/purchase-test-support";
import { createClientRuntime, jsonResponse, routeFetcher, studioRules } from "../test-support";

jest.setTimeout(30_000);

// FIX-002 (booking ADR-0005): a renewal while the current Plan still has
// classes starts the day after it ends, and no Start Date is chosen.
const current = {
  id: "subscription-1",
  planName: "Paquete de 8 clases",
  originalClassAllowance: 8,
  remainingClassAllowance: 3,
  startsOn: "2026-08-25",
  endsOn: "2026-09-24",
  extraClassesLine: null,
};

const renewFrom = async (view: object) => {
  const created = jest.fn();
  const fetcher = routeFetcher({
    ...baseRoutes(0),
    "/api/v1/clients/current/subscription": () => jsonResponse(view),
    "/api/v1/studio-rules": () => jsonResponse(studioRules),
    "POST /api/v1/purchase-intents": (init) => {
      created(JSON.parse(String(init?.body)));
      return jsonResponse(intent, 201);
    },
  });
  const screen = await render(<App runtime={createClientRuntime(fetcher)} />);
  await waitFor(
    () => {
      expect(screen.getByRole("button", { name: "Ver detalle" })).toBeOnTheScreen();
    },
    { timeout: 10_000 },
  );
  await fireEvent.press(screen.getByRole("button", { name: "Ver detalle" }));
  await fireEvent.press(await screen.findByRole("button", { name: "Renovar plan" }));
  await fireEvent.press(await screen.findByRole("button", { name: /^Paquete de 8 clases,/ }));
  expect(await screen.findByText("Total a pagar")).toBeOnTheScreen();
  return { created, screen };
};

describe("Renewing from the Plan detail", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("names the fixed start instead of offering dates while classes remain", async () => {
    const { created, screen } = await renewFrom({
      status: "active",
      subscription: current,
      renewalStartsOn: "2026-09-25",
    });

    expect(screen.queryByTestId("start-date-chooser")).toBeNull();
    expect(
      screen.getByText("Tu nuevo plan empieza el 25 de septiembre, al terminar el actual."),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Continuar al pago" }));
    await waitFor(() => {
      expect(created).toHaveBeenCalledWith({ planId: "plan-8" });
    });
  });

  it("offers the dates when the current Plan has nothing left", async () => {
    const { screen } = await renewFrom({
      status: "active",
      subscription: { ...current, remainingClassAllowance: 0 },
    });

    expect(screen.getByTestId("start-date-chooser")).toBeOnTheScreen();
    expect(screen.queryByText(/al terminar el actual/)).toBeNull();
  });
});
