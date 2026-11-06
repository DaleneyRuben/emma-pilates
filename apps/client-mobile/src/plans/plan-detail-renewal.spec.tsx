import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { baseRoutes, intent } from "../payments/purchase-test-support";
import { createClientRuntime, jsonResponse, routeFetcher, studioRules } from "../test-support";

jest.setTimeout(30_000);

// FIX-002 (booking ADR-0005, ADR-0013): a renewal while the current Plan still
// has classes starts inside the next Plan window, after the current end.
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
      expect(screen.getByRole("button", { name: "Mi plan" })).toBeOnTheScreen();
    },
    { timeout: 10_000 },
  );
  await fireEvent.press(screen.getByRole("button", { name: "Mi plan" }));
  await fireEvent.press(await screen.findByRole("button", { name: "Renovar mi plan" }));
  await fireEvent.press(await screen.findByRole("button", { name: /^Paquete de 8 clases,/ }));
  expect(await screen.findByText("Desglose")).toBeOnTheScreen();
  return { created, screen };
};

describe("Renewing from the Plan detail", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  // booking ADR-0013 (design follow-up 254 § 4): the next Plan picks a day
  // from the day after the current end through 28 days after it.
  it("offers the next Plan's days from the day after the current end", async () => {
    const { created, screen } = await renewFrom({
      status: "active",
      subscription: current,
      renewalStartsOn: "2026-09-25",
    });

    expect(screen.getByTestId("start-date-2026-09-25")).toHaveProp("accessibilityState", {
      selected: true,
    });
    expect(screen.getByTestId("start-date-2026-10-22")).toBeOnTheScreen();
    expect(screen.queryByTestId("start-date-2026-10-23")).toBeNull();
    expect(screen.queryByText(/al terminar el actual/)).toBeNull();
    await fireEvent.press(screen.getByTestId("start-date-2026-10-01"));
    expect(
      screen.getByText(
        "Tu plan actual vence el 24 de septiembre. El nuevo empieza el 1 de octubre; se puede elegir hasta el 22 de octubre.",
      ),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId("plan-continue-to-payment"));
    await waitFor(() => {
      expect(created).toHaveBeenCalledWith({ planId: "plan-8", startsOn: "2026-10-01" });
    });
  });

  it("offers the dates when the current Plan has nothing left", async () => {
    const { screen } = await renewFrom({
      status: "active",
      subscription: { ...current, remainingClassAllowance: 0 },
    });

    expect(screen.getByTestId("start-date-chooser")).toBeOnTheScreen();
    // C09 titles the day tiles once.
    expect(screen.getAllByText("Fecha de inicio")).toHaveLength(1);
    expect(screen.queryByText(/al terminar el actual/)).toBeNull();
  });
});
