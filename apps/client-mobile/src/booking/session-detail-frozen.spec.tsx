import { cleanup, fireEvent, waitFor } from "@testing-library/react-native";
import { addCivilDays, boliviaCivilDate, clearMobileQueryCache } from "@pilates/mobile-core";

import { weekdayDayMonth } from "../subscription/freeze-window";
import { jsonResponse } from "../test-support";
import { openDetail, startsAt, subscription } from "./session-detail-test-support";

jest.setTimeout(20_000);

// Walkthrough finding 53 (owner 2026-11-08): on a day the Client's plan is
// frozen, the class detail turns Reservar off and says so before she taps;
// the waitlist too. FIX-082 (design audit 2026-11-18, option B): the button
// itself says why, over the frozen days and the first day she can book,
// under a neutral header without the cancellation line.
const classDay = boliviaCivilDate(startsAt);
const frozen = (startsOn: string, endsOn: string) => ({
  "/api/v1/clients/current/subscription": () =>
    jsonResponse({
      ...subscription(5),
      freeze: { id: "freeze-1", state: "approved", startsOn, endsOn },
      canRequestFreeze: false,
    }),
});

describe("Client Session detail on a frozen day", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("lets the off button say why, with the frozen days and the next day to book", async () => {
    const endsOn = addCivilDays(classDay, 2);
    const { screen } = await openDetail(frozen(addCivilDays(classDay, -1), endsOn));

    const button = screen.getByRole("button", { name: "No disponible durante el congelamiento" });
    expect(button).toBeDisabled();
    expect(button).toHaveStyle({ backgroundColor: "#E7DCD8" });
    expect(screen.queryByRole("button", { name: "Reservar" })).toBeNull();
    expect(screen.getByText(/^Tu plan está congelado del /)).toHaveStyle({ fontWeight: "600" });
    expect(
      screen.getByText(`Podrás reservar desde el ${weekdayDayMonth(addCivilDays(endsOn, 1))}.`),
    ).toBeOnTheScreen();
    expect(screen.queryByText("Se descuenta 1 clase de tu plan")).toBeNull();
  });

  it("draws a neutral header and drops the free cancellation line", async () => {
    const { screen } = await openDetail(frozen(classDay, classDay));

    expect(screen.getByTestId("session-hero")).toHaveStyle({ backgroundColor: "#F5EFE9" });
    expect(screen.getByText("3 de 12 cupos libres")).toBeOnTheScreen();
    expect(screen.queryByText(/^Cancela sin costo/)).toBeNull();
  });

  it("offers another day, back on the class list", async () => {
    const { screen } = await openDetail(frozen(classDay, classDay));

    await fireEvent.press(screen.getByRole("button", { name: "Elegir otro día" }));

    await waitFor(() => expect(screen.queryByText("Sobre la clase")).toBeNull());
    expect(screen.getByTestId("browse-day-strip")).toBeOnTheScreen();
  });

  it("closes the waitlist of a full class on a frozen day", async () => {
    const { screen } = await openDetail(frozen(classDay, classDay), 5, 0);

    expect(screen.getByText(/^Tu plan está congelado el /)).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "No disponible durante el congelamiento" }),
    ).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Unirme a la lista de espera" })).toBeNull();
  });

  it("books as usual outside the frozen days", async () => {
    const { screen } = await openDetail(
      frozen(addCivilDays(classDay, 1), addCivilDays(classDay, 3)),
    );

    expect(screen.getByRole("button", { name: "Reservar" })).toBeEnabled();
    expect(screen.queryByText(/congelado/)).toBeNull();
  });
});
