import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(20_000);

const plans = [
  {
    id: "plan-1",
    name: "Clase suelta",
    durationDays: 30,
    weeklyClassCap: null,
    durationMonths: 1,
    classAllowance: 1,
    priceCentavos: 8_000,
  },
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

const subscription = (planName: string) => ({
  id: "subscription-1",
  planName,
  originalClassAllowance: 24,
  remainingClassAllowance: 20,
  startsOn: "2026-11-08",
  endsOn: "2027-02-08",
});

function renderApp(view: unknown, plansOnSale: unknown[] = plans) {
  return render(
    <App
      runtime={createClientRuntime(
        routeFetcher({
          "/api/v1/clients/current": () =>
            jsonResponse({ id: "client-1", name: "Carla Ríos", email: "carla@example.com" }),
          "/api/v1/clients/current/subscription": () => jsonResponse(view),
          "/api/v1/plans": () => jsonResponse(plansOnSale),
          "/api/v1/plans/plan-24": () => jsonResponse(plans[2]),
        }),
      )}
    />,
  );
}

async function openPlansFromMyPlan(screen: Awaited<ReturnType<typeof renderApp>>) {
  await waitFor(() => expect(screen.getByRole("button", { name: /^Mi plan, / })).toBeOnTheScreen());
  await fireEvent.press(screen.getByRole("button", { name: /^Mi plan, / }));
  await fireEvent.press(await screen.findByRole("button", { name: "Renovar mi plan" }));
}

async function openPlansFromHome(screen: Awaited<ReturnType<typeof renderApp>>) {
  await fireEvent.press(await screen.findByRole("button", { name: "Comprar un plan" }));
}

// FIX-082 marked the Plan she has now; C3 A (decisions of 2026-11-19) lifts it
// into a Palo de rosa block on top, to renew, and lists the rest below.
describe("Client Plans with a current Plan", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("puts the Client's current Plan on top to renew and the rest under «Otros planes»", async () => {
    const screen = await renderApp({
      status: "active",
      subscription: subscription("Trimestral 24 clases"),
      nextSubscription: null,
    });
    await openPlansFromMyPlan(screen);

    const hero = await screen.findByTestId("plan-renewal-plan-24");
    expect(hero).toHaveStyle({ backgroundColor: "#93615D" });
    expect(within(hero).getByText("Renueva tu plan")).toBeOnTheScreen();
    expect(within(hero).getByText("Trimestral 24 clases")).toBeOnTheScreen();
    expect(within(hero).getByText("90 días · hasta 3 por semana")).toBeOnTheScreen();
    expect(within(hero).getByText("Bs 1.800")).toBeOnTheScreen();
    expect(screen.queryByTestId("plan-card-plan-24")).toBeNull();
    expect(screen.getByRole("header", { name: "Otros planes" })).toBeOnTheScreen();
    // Every other Plan stays, the single class included.
    expect(screen.getByTestId("plan-card-plan-1")).toBeOnTheScreen();
    expect(screen.getByTestId("plan-card-plan-8")).toBeOnTheScreen();

    await fireEvent.press(within(hero).getByRole("button", { name: "Renovar este plan" }));
    await waitFor(() => expect(screen.getByText("Hasta 3 clases por semana")).toBeOnTheScreen());
  });

  it("names the discount and strikes the list price when the offer applies", async () => {
    const discounted = plans.map((plan) => ({
      ...plan,
      priceCentavos: Math.round(plan.priceCentavos * 0.85),
      listPriceCentavos: plan.priceCentavos,
    }));
    const screen = await renderApp(
      { status: "active", subscription: subscription("Trimestral 24 clases") },
      discounted,
    );
    await openPlansFromMyPlan(screen);

    const hero = await screen.findByTestId("plan-renewal-plan-24");
    expect(within(hero).getByText("Renueva tu plan · 15 % menos")).toBeOnTheScreen();
    expect(within(hero).getByText("Bs 1.530")).toBeOnTheScreen();
    expect(within(hero).getByText("Bs 1.800")).toHaveStyle({ textDecorationLine: "line-through" });
    // The offer banner stays, quiet under the list: the block is the one hero.
    expect(screen.getByTestId("plans-launch-banner")).toHaveStyle({ backgroundColor: "#FFFBFB" });
  });

  it("offers to renew the Plan of an expired Subscription", async () => {
    const screen = await renderApp({
      status: "expired",
      subscription: subscription("Paquete de 8 clases"),
    });
    await openPlansFromHome(screen);

    const hero = await screen.findByTestId("plan-renewal-plan-8");
    expect(within(hero).getByText("30 días")).toBeOnTheScreen();
  });

  it.each([
    [
      "the current Plan is no longer sold",
      { status: "active", subscription: subscription("Mensual 4 clases") },
      openPlansFromMyPlan,
    ],
    ["it is a first purchase", { status: "none", subscription: null }, openPlansFromHome],
    [
      "the last thing she had was a Guest Pass",
      {
        status: "expired",
        subscription: { ...subscription("Clase suelta"), guestPass: { usedClassStartsAt: null } },
      },
      openPlansFromHome,
    ],
  ])("lists every Plan as before when %s", async (_case, view, open) => {
    const screen = await renderApp(view);
    await open(screen);

    expect(await screen.findByTestId("plan-card-plan-24")).toBeOnTheScreen();
    expect(screen.getByTestId("plan-card-plan-1")).toBeOnTheScreen();
    expect(screen.queryByTestId(/^plan-renewal-/)).toBeNull();
    expect(screen.queryByText("Otros planes")).toBeNull();
  });
});
