import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { addCivilDays, boliviaCivilDate, clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { formatCivilDate } from "../home/home-format";
import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";
import { freezeRange } from "./freeze-window";

jest.setTimeout(20_000);

const hidden = { includeHiddenElements: true };
const today = boliviaCivilDate(new Date());
const endsOn = addCivilDays(today, 80);

const view = (extra: Record<string, unknown> = {}) => ({
  status: "active",
  subscription: {
    id: "subscription-1",
    planName: "Trimestral 24 clases",
    originalClassAllowance: 24,
    remainingClassAllowance: 24,
    startsOn: addCivilDays(today, -10),
    endsOn,
    extraClasses: 1,
    extraClassesLine: "Clases extra: 1 · Campaña",
  },
  nextSubscription: null,
  freeze: null,
  canRequestFreeze: true,
  founderRenewalDeadline: addCivilDays(endsOn, 8),
  ...extra,
});

async function openMiPlan(subscription: unknown) {
  const screen = await render(
    <App
      runtime={createClientRuntime(
        routeFetcher({
          "/api/v1/clients/current": () =>
            jsonResponse({ id: "client-1", name: "Carla Ríos", email: "carla@example.com" }),
          "/api/v1/clients/current/subscription": () => jsonResponse(subscription),
        }),
      )}
    />,
  );
  await waitFor(() => expect(screen.getByRole("button", { name: /^Mi plan, / })).toBeOnTheScreen());
  await fireEvent.press(screen.getByRole("button", { name: /^Mi plan, / }));
  await waitFor(() => expect(screen.getByTestId("subscription-hero")).toBeOnTheScreen());
  return screen;
}

// FIX-082 (design audit 2026-11-18, Mi plan option A): a light plan card like
// Inicio's, «Renovar mi plan» right under it with the discount, the Freeze as
// one row, and the end said once.
describe("Mi plan, option A", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  // FIX-089: «Activo» is a normal state, said in words without a dot.
  it("draws the plan on a Crema card with «Activo» in words and one detail line", async () => {
    const screen = await openMiPlan(view());

    const hero = screen.getByTestId("subscription-hero");
    expect(hero).toHaveStyle({ backgroundColor: "#F9F4F2", borderColor: "#CDA697" });
    const card = within(hero);
    expect(card.getByText("Trimestral 24 clases")).toBeOnTheScreen();
    expect(card.getByText("Activo")).toHaveStyle({ color: "#93615D" });
    expect(card.queryByTestId("subscription-status-dot")).toBeNull();
    expect(card.getByText("25")).toHaveStyle({ color: "#93615D" });
    expect(card.getByText("clases restantes")).toBeOnTheScreen();
    expect(
      card.getByText(`24 del plan + 1 de regalo (campaña) · vence el ${formatCivilDate(endsOn)}`),
    ).toBeOnTheScreen();
    expect(screen.queryByText("Clases extra: 1 · Campaña")).toBeNull();
    expect(screen.queryByRole("progressbar", hidden)).toBeNull();
  });

  it("names every origin of the extra classes", async () => {
    const base = view();
    const screen = await openMiPlan({
      ...base,
      subscription: {
        ...base.subscription,
        extraClasses: 2,
        extraClassesLine: "Clases extra: 2 · 1 de invitación · 1 de campaña",
      },
    });

    expect(
      screen.getByText(
        `24 del plan + 2 de regalo (1 de invitación, 1 de campaña) · vence el ${formatCivilDate(endsOn)}`,
      ),
    ).toBeOnTheScreen();
  });

  it("puts «Renovar mi plan» right under the card with the discount line", async () => {
    const screen = await openMiPlan(view());

    expect(screen.getByRole("button", { name: "Renovar mi plan" })).toHaveStyle({
      backgroundColor: "#93615D",
    });
    expect(
      screen.getByText(
        `Renueva antes del ${formatCivilDate(addCivilDays(endsOn, 8))} y mantienes tu 15 % de descuento.`,
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId("glyph-refresh", hidden)).toBeNull();
  });

  it("says the end once, in the card and the details", async () => {
    const screen = await openMiPlan(view({ status: "expiring_soon" }));

    expect(screen.queryByText(/^Tu plan vence el/)).toBeNull();
    // FIX-089: the exception is the one Rubor pill.
    const hero = within(screen.getByTestId("subscription-hero"));
    expect(within(hero.getByTestId("exception-pill")).getByText("Por vencer")).toBeOnTheScreen();
  });

  it("shows the Freeze as one row that opens its detail", async () => {
    const start = addCivilDays(today, 2);
    const end = addCivilDays(today, 4);
    const screen = await openMiPlan(
      view({
        freeze: { id: "freeze-1", state: "approved", startsOn: start, endsOn: end },
        canRequestFreeze: false,
      }),
    );

    const row = screen.getByRole("button", { name: /^Congelado d/ });
    expect(
      within(row).getByText(`Congelado d${freezeRange(start, end).slice(1)}`),
    ).toBeOnTheScreen();
    expect(within(row).getByText("Aprobado · esos días no puedes reservar")).toBeOnTheScreen();
    expect(screen.queryByText(/^Esos días no puedes reservar\./)).toBeNull();

    await fireEvent.press(row);

    expect(screen.getByText(/^Esos días no puedes reservar\./)).toBeOnTheScreen();
  });

  it("keeps freezing as a row without a tinted disc", async () => {
    const screen = await openMiPlan(view());

    expect(screen.getByRole("button", { name: "Congelar plan" })).toBeOnTheScreen();
    expect(screen.getByTestId("glyph-sun", hidden)).toHaveProp("stroke", "#93615D");
  });
});
