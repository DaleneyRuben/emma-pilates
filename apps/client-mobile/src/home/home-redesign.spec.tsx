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

  // EncabezadoA (FIX-089): a root screen's title is the shared 30 pt Lora 500.
  it("titles Inicio like every root screen, with a Rosa profundo bell", async () => {
    const screen = await openHome({ status: "active", subscription: trimestral });

    expect(screen.getByRole("header", { name: "Inicio" })).toHaveStyle({
      fontFamily: "Lora_500Medium",
      fontSize: 30,
    });
    expect(screen.getByTestId("glyph-bell", hidden)).toHaveProp("stroke", "#93615D");
  });

  it("makes «Reservar una clase» the one solid button", async () => {
    const screen = await openHome({ status: "active", subscription: trimestral });

    const book = screen.getByRole("button", { name: "Reservar una clase" });
    expect(book).toHaveStyle({ backgroundColor: "#93615D", minHeight: 52 });
    expect(screen.queryByTestId("shortcut-disc")).toBeNull();

    await fireEvent.press(book);
    // The Reservar tab's Lora 30 heading, not the tab button of the same name.
    await waitFor(() => expect(screen.getByLabelText("Reservar")).toHaveStyle({ fontSize: 30 }));
  });

  it("draws the Plan as a light row with the weekly cap and no Mi plan pill", async () => {
    const screen = await openHome({ status: "active", subscription: trimestral });

    const row = screen.getByTestId("home-plan-card");
    expect(row).toHaveStyle({ backgroundColor: "#F9F4F2", borderColor: "#CDA697" });
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

  // The tablet carousel stops at 720 pt from the left edge (UX-012), so the
  // button and the row under it line up with it instead of centring.
  it("lines the button and the Plan row up with the promotion on a tablet", async () => {
    const screen = await openHome({ status: "active", subscription: trimestral });

    expect(screen.getByTestId("home-book-frame")).toHaveStyle({
      alignSelf: "flex-start",
      maxWidth: 720,
    });
    expect(screen.getByTestId("home-plan-card")).toHaveStyle({
      alignSelf: "flex-start",
      maxWidth: 720,
    });
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

  // Review of FIX-082: Inicio and Reservar say a used-up week the same way.
  it("says a used-up week like Reservar does", async () => {
    const screen = await openHome({
      status: "active",
      subscription: { ...trimestral, classesLeftThisWeek: 0 },
    });

    expect(
      within(screen.getByTestId("home-plan-card")).getByText(
        "Ya usaste tus clases de esta semana · vence el 5 de febrero",
      ),
    ).toBeOnTheScreen();
  });

  // Review of FIX-082: the Guest Pass card keeps its own action, so no second
  // solid button, and it lines up with the promotion on a tablet.
  it("leaves the solid button to the Guest Pass card", async () => {
    const screen = await openHome({
      status: "active",
      subscription: {
        ...trimestral,
        planName: "Pase de invitada",
        originalClassAllowance: 1,
        remainingClassAllowance: 1,
        classesLeftThisWeek: null,
        guestPass: { usedClassStartsAt: null },
      },
    });

    await waitFor(() => expect(screen.getByTestId("home-guest-pass-card")).toBeOnTheScreen());
    expect(screen.queryByTestId("home-book")).toBeNull();
    expect(screen.getByTestId("home-guest-pass-card")).toHaveStyle({ alignSelf: "flex-start" });
  });

  it("keeps «Por vencer» as the one exception on the row", async () => {
    const screen = await openHome({
      status: "expiring_soon",
      subscription: { ...trimestral, classesLeftThisWeek: 1, remainingClassAllowance: 1 },
    });

    const inRow = within(screen.getByTestId("home-plan-card"));
    expect(inRow.getByText("Trimestral · 1 restante")).toBeOnTheScreen();
    expect(inRow.getByText("Esta semana te queda 1 · vence el 5 de febrero")).toBeOnTheScreen();
    // FIX-089: the exception is the one Rubor pill.
    expect(within(inRow.getByTestId("exception-pill")).getByText("Por vencer")).toBeOnTheScreen();
  });

  it("keeps the other shortcuts quiet, without a tinted disc", async () => {
    const screen = await openHome({ status: "active", subscription: trimestral });

    for (const label of ["Evaluación nutricional", "Invita a una amiga"]) {
      expect(screen.getByRole("button", { name: label })).toHaveStyle({
        backgroundColor: "#F9F4F2",
      });
    }
    expect(screen.getByTestId("glyph-health", hidden)).toHaveProp("stroke", "#93615D");
    expect(screen.queryByTestId("glyph-calendar", hidden)).toBeNull();
  });
});
