import { cleanup, fireEvent, waitFor, within } from "@testing-library/react-native";
import { addCivilDays, boliviaCivilDate, clearMobileQueryCache } from "@pilates/mobile-core";

import { dayMonth } from "../subscription/freeze-window";
import { jsonResponse } from "../test-support";
import { detail, openDetail, startsAt, subscription } from "./session-detail-test-support";

jest.setTimeout(20_000);

// Walkthrough finding 53 (owner 2026-11-08): on a day the Client's plan is
// frozen, the class detail turns Reservar off and says so before she taps;
// the waitlist too. FIX-082 (design audit 2026-11-18, option B): the button
// itself says why, over the frozen days and the first day she can book,
// under a neutral header without the cancellation line.
const classDay = boliviaCivilDate(startsAt);
// C1 (owner 2026-11-19): Reservar no longer lists a frozen day's classes, so
// the detail says it when the Freeze is approved while she is already there.
function openFrozen(
  startsOn: string,
  endsOn: string,
  routes: Parameters<typeof openDetail>[0] = {},
  availableSeats = 3,
) {
  let approved = false;
  return openDetail(
    {
      "/api/v1/clients/current/subscription": () =>
        jsonResponse(
          approved
            ? {
                ...subscription(5),
                freeze: { id: "freeze-1", state: "approved", startsOn, endsOn },
                canRequestFreeze: false,
              }
            : subscription(5),
        ),
      ...routes,
    },
    5,
    availableSeats,
    {},
    startsAt,
    () => {
      approved = true;
    },
  );
}

describe("Client Session detail on a frozen day", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("lets the off button say why, with the frozen days and the next day to book", async () => {
    const endsOn = addCivilDays(classDay, 2);
    const { screen } = await openFrozen(addCivilDays(classDay, -1), endsOn);

    const button = screen.getByRole("button", { name: "No disponible durante el congelamiento" });
    expect(button).toBeDisabled();
    // Rosa Emma's disabled look (50 with a 400 outline), with the day she can
    // book as its reason line right under it (FIX-089, C04j).
    expect(button).toHaveStyle({ backgroundColor: "#FEF6F2", borderColor: "#CDA697" });
    expect(button).toHaveProp("accessibilityHint", expect.stringMatching(/^Podrás reservar desde/));
    expect(screen.queryByRole("button", { name: "Reservar esta clase" })).toBeNull();
    expect(screen.getByText(/^Tu plan está congelado del /)).toHaveStyle({ fontWeight: "700" });
    // FIX-090: the shared list date inside the sentence, «lun 23 nov».
    expect(
      screen.getByText(`Podrás reservar desde el ${dayMonth(addCivilDays(endsOn, 1))}.`),
    ).toBeOnTheScreen();
    expect(screen.queryByText(/^Usarás/)).toBeNull();
  });

  it("draws a neutral header and drops the free cancellation line", async () => {
    const { screen } = await openFrozen(classDay, classDay);

    expect(screen.getByTestId("session-hero")).toHaveStyle({
      backgroundColor: "#FFFBFB",
      borderRadius: 20,
    });
    expect(
      within(screen.getByTestId("session-fact-places")).getByText("3 de 12 libres"),
    ).toBeOnTheScreen();
    expect(screen.queryByText("Cancelas gratis hasta")).toBeNull();
    // FIX-082: the facts' icons stand alone, no tinted disc.
    expect(screen.queryByTestId("icon-row-disc", { includeHiddenElements: true })).toBeNull();
  });

  it("leaves out the classes left this week, which a frozen day cannot use", async () => {
    const { screen } = await openFrozen(classDay, classDay, {
      "/api/v1/sessions/session-1": () => jsonResponse(detail(3, 2)),
    });

    expect(screen.queryByText(/clases? esta semana/)).toBeNull();
  });

  it("offers another day, back on the class list", async () => {
    const { screen } = await openFrozen(classDay, classDay);

    await fireEvent.press(screen.getByRole("button", { name: "Elegir otro día" }));

    await waitFor(() => expect(screen.queryByText("Sobre la clase")).toBeNull());
    expect(screen.getByTestId("browse-day-strip")).toBeOnTheScreen();
  });

  it("closes the waitlist of a full class on a frozen day", async () => {
    const { screen } = await openFrozen(classDay, classDay, {}, 0);

    expect(screen.getByText(/^Tu plan está congelado el /)).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "No disponible durante el congelamiento" }),
    ).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Unirme a la lista de espera" })).toBeNull();
  });

  it("books as usual outside the frozen days", async () => {
    const { screen } = await openFrozen(addCivilDays(classDay, 1), addCivilDays(classDay, 3));

    expect(screen.getByRole("button", { name: "Reservar esta clase" })).toBeEnabled();
    expect(screen.queryByText(/congelado/)).toBeNull();
  });
});
