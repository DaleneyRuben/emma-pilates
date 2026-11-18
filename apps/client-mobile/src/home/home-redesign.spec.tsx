import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(20_000);

const hidden = { includeHiddenElements: true };

const profile = {
  id: "client-1",
  name: "Carla Méndez",
  email: "carla@example.com",
  phone: null,
  referralCode: "REF-CARLA",
};

const trimestral = {
  id: "subscription-1",
  planName: "Trimestral",
  originalClassAllowance: 36,
  remainingClassAllowance: 25,
  startsOn: "2026-11-05",
  endsOn: "2027-02-05",
  classesLeftThisWeek: 3,
};

async function openHome(subscription: unknown) {
  const screen = await render(
    <App
      runtime={createClientRuntime(
        routeFetcher({
          "/api/v1/clients/current": () => jsonResponse(profile),
          "/api/v1/clients/current/subscription": () => jsonResponse(subscription),
        }),
      )}
    />,
  );
  await waitFor(() => expect(screen.getByText("Hola, Carla")).toBeOnTheScreen());
  return screen;
}

// FIX-082 (design audit 2026-11-18, Inicio option A): «Reservar una clase»
// is the one solid action, the Plan is a light row tappable as a whole with
// a chevron, and the row says the weekly cap so 25 never contradicts 3.
describe("Client Inicio, option A", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("makes «Reservar una clase» the one solid button", async () => {
    const screen = await openHome({ status: "active", subscription: trimestral });

    const book = screen.getByRole("button", { name: "Reservar una clase" });
    expect(book).toHaveStyle({ backgroundColor: "#B78380", minHeight: 52 });
    expect(screen.queryByTestId("shortcut-disc")).toBeNull();

    await fireEvent.press(book);
    // The Reservar tab's Lora 30 heading, not the tab button of the same name.
    await waitFor(() => expect(screen.getByLabelText("Reservar")).toHaveStyle({ fontSize: 30 }));
  });

  it("draws the Plan as a light row with the weekly cap and no Mi plan pill", async () => {
    const screen = await openHome({ status: "active", subscription: trimestral });

    const row = screen.getByTestId("home-plan-card");
    expect(row).toHaveStyle({ backgroundColor: "#F5EFE9" });
    const inRow = within(row);
    expect(inRow.getByText("Trimestral · 25 restantes")).toBeOnTheScreen();
    expect(inRow.getByText("Esta semana te quedan 3 · vence el 5 de febrero")).toBeOnTheScreen();
    expect(inRow.getByTestId("chevron", hidden)).toBeOnTheScreen();
    expect(screen.queryByText("Activo")).toBeNull();
    expect(screen.queryByRole("button", { name: "Mi plan" })).toBeNull();
    expect(
      screen.getByRole("button", {
        name: "Mi plan, Trimestral, 25 clases restantes, esta semana te quedan 3, vence el 5 de febrero",
      }),
    ).toBeOnTheScreen();
  });

  it("opens Mi plan from anywhere on the Plan row", async () => {
    const screen = await openHome({ status: "active", subscription: trimestral });

    await fireEvent.press(screen.getByRole("button", { name: /^Mi plan, Trimestral/ }));

    await waitFor(() => expect(screen.getByRole("header", { name: "Mi plan" })).toBeOnTheScreen());
  });

  it("leaves the week out without a cap and names the gift classes", async () => {
    const screen = await openHome({
      status: "active",
      subscription: { ...trimestral, classesLeftThisWeek: null, extraClasses: 1 },
    });

    const inRow = within(screen.getByTestId("home-plan-card"));
    expect(inRow.getByText("Trimestral · 26 restantes")).toBeOnTheScreen();
    expect(inRow.getByText("25 del plan + 1 de regalo · vence el 5 de febrero")).toBeOnTheScreen();
    expect(screen.queryByText(/esta semana/i)).toBeNull();
  });

  it("keeps «Por vencer» as the one exception on the row", async () => {
    const screen = await openHome({
      status: "expiring_soon",
      subscription: { ...trimestral, classesLeftThisWeek: 1, remainingClassAllowance: 1 },
    });

    const inRow = within(screen.getByTestId("home-plan-card"));
    expect(inRow.getByText("Trimestral · 1 restante")).toBeOnTheScreen();
    expect(inRow.getByText("Esta semana te queda 1 · vence el 5 de febrero")).toBeOnTheScreen();
    expect(inRow.getByText("Por vencer")).toHaveStyle({ color: "#9A7434" });
  });

  it("keeps the other shortcuts quiet, without a tinted disc", async () => {
    const screen = await openHome({ status: "active", subscription: trimestral });

    for (const label of ["Evaluación nutricional", "Invita a una amiga"]) {
      expect(screen.getByRole("button", { name: label })).toHaveStyle({
        backgroundColor: "#F5EFE9",
      });
    }
    expect(screen.getByTestId("glyph-health", hidden)).toHaveProp("stroke", "#6F6662");
    expect(screen.queryByTestId("glyph-calendar", hidden)).toBeNull();
  });
});
