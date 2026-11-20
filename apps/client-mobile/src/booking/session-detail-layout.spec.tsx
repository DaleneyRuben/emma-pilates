import { cleanup, within } from "@testing-library/react-native";
import { formatDateTime, formatTitleDate } from "@pilates/api-contracts";
import { clearMobileQueryCache, formatStartTime } from "@pilates/mobile-core";

import { jsonResponse, studioRules } from "../test-support";
import { endsAt, openDetail, startsAt, subscription } from "./session-detail-test-support";

jest.setTimeout(20_000);

const factValue = (screen: Awaited<ReturnType<typeof openDetail>>["screen"], label: string) =>
  within(screen.getByTestId(`session-fact-${label}`));

// C4 A (decisions of 2026-11-19, Rosa Emma C04): the day, the time and the
// class on the 600 hero; the Trainer, the Branch, the places and the
// free-cancellation limit on a white card; «Reservar esta clase» with what it
// uses on the white footer.
describe("Client Session detail layout", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("names the day, the time, the class and its minutes on the 600 hero", async () => {
    const { screen } = await openDetail({});

    const hero = within(screen.getByTestId("session-hero"));
    expect(screen.getByTestId("session-hero")).toHaveStyle({ backgroundColor: "#93615D" });
    expect(hero.getByText(formatTitleDate(startsAt))).toBeOnTheScreen();
    expect(
      hero.getByRole("header", {
        name: `${formatStartTime(startsAt.toISOString())} · Reformer Pilates`,
      }),
    ).toBeOnTheScreen();
    expect(
      hero.getByText(`75 minutos · termina ${formatStartTime(endsAt.toISOString())}`),
    ).toBeOnTheScreen();
    // The block names the class, so the header above it is only the arrow.
    expect(within(screen.getByTestId("screen-top-bar")).queryByRole("header")).toBeNull();
  });

  it("lists the Trainer, the Branch, the free places and the free-cancellation limit", async () => {
    const { screen } = await openDetail({});

    const table = screen.getByTestId("session-facts");
    expect(table).toHaveStyle({ backgroundColor: "#FFFBFB", borderRadius: 20 });
    expect(factValue(screen, "trainer").getByText("Instructora")).toBeOnTheScreen();
    expect(factValue(screen, "trainer").getByText("Emma Vargas")).toBeOnTheScreen();
    expect(factValue(screen, "trainer").getByText("EV")).toBeOnTheScreen();
    expect(factValue(screen, "branch").getByText("Centro")).toBeOnTheScreen();
    expect(factValue(screen, "places").getByText("3 de 12 libres")).toBeOnTheScreen();
    const deadline = new Date(startsAt.getTime() - studioRules.cancellationWindowMinutes * 60_000);
    expect(factValue(screen, "cancel").getByText("Cancelas gratis hasta")).toBeOnTheScreen();
    expect(factValue(screen, "cancel").getByText(formatDateTime(deadline))).toBeOnTheScreen();
  });

  it.each([
    [1, "Último lugar"],
    [0, "Clase llena"],
  ])("says %i free places as «%s»", async (availableSeats, label) => {
    const { screen } = await openDetail({}, 5, availableSeats);

    expect(factValue(screen, "places").getByText(label)).toBeOnTheScreen();
  });

  it("books with «Reservar esta clase» and says how many classes she has", async () => {
    const { screen } = await openDetail({}, 25);

    expect(screen.getByRole("button", { name: "Reservar esta clase" })).toBeEnabled();
    expect(screen.getByText("Usarás 1 de tus 25 clases.")).toBeOnTheScreen();
    const footer = within(screen.getByTestId("session-footer"));
    expect(screen.getByTestId("session-footer")).toHaveStyle({ backgroundColor: "#FFFBFB" });
    expect(footer.getByText("Usarás 1 de tus 25 clases.")).toBeOnTheScreen();
  });

  it("counts her live extra classes with the Plan's", async () => {
    const { screen } = await openDetail({
      "/api/v1/clients/current/subscription": () => {
        const view = subscription(4);
        return jsonResponse({ ...view, subscription: { ...view.subscription, extraClasses: 2 } });
      },
    });

    expect(screen.getByText("Usarás 1 de tus 6 clases.")).toBeOnTheScreen();
  });

  it("says when the class takes her last class", async () => {
    const { screen } = await openDetail({}, 1);

    expect(screen.getByText("Usarás tu última clase.")).toBeOnTheScreen();
  });
});
