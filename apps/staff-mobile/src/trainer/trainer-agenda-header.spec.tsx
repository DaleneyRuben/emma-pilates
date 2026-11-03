import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(20_000);

// 2026-10-21 is a Wednesday in Bolivia (UTC−4), so the strip's seven days
// run Lun 19 through Dom 25 and include both weekend names.
const wednesday = new Date("2026-10-21T16:00:00.000Z");

const renderTrainer = () =>
  render(
    <App
      runtime={createStaffRuntime(
        routeFetcher({
          "/api/v1/trainer/sessions": () => jsonResponse([]),
          "/api/v1/staff-members/current": () =>
            jsonResponse({
              id: "staff-1",
              name: "Emma Vargas",
              email: "emma.vargas@example.com",
              phone: null,
              role: "trainer",
              branches: [],
            }),
          "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
        }),
      )}
    />,
  );

// v2 S02 (owner, 2026-11-02): the agenda opens on today, shows no past
// days because attendance is never corrected, and keeps a «Hoy» button.
describe("Trainer agenda header", () => {
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ["nextTick", "queueMicrotask", "setImmediate"] });
    jest.setSystemTime(wednesday);
  });

  afterEach(async () => {
    jest.useRealTimers();
    await cleanup();
    clearMobileQueryCache();
  });

  it("puts the role and today's date over the greeting", async () => {
    const screen = await renderTrainer();

    await waitFor(() => {
      expect(screen.getByLabelText("Mi agenda")).toHaveTextContent("Hola, Emma");
    });
    expect(screen.getByText("Entrenadora · Miércoles 21 de octubre")).toBeOnTheScreen();
  });

  it("starts the week strip today and never shows a past day", async () => {
    const screen = await renderTrainer();

    await waitFor(() => {
      expect(screen.getByLabelText("Hoy 21")).toBeOnTheScreen();
    });
    expect(screen.getByLabelText("Hoy 21")).toHaveProp("accessibilityState", { selected: true });
    expect(screen.getByLabelText("Sáb 24")).toBeOnTheScreen();
    expect(screen.getByLabelText("Mar 27")).toBeOnTheScreen();
    expect(screen.queryByLabelText("Lun 19")).toBeNull();
    expect(screen.queryByLabelText("Mar 20")).toBeNull();
  });

  it("offers today again from an empty day and from the «Hoy» button", async () => {
    const screen = await renderTrainer();
    await waitFor(() => expect(screen.getByLabelText("Sáb 24")).toBeOnTheScreen());

    await fireEvent.press(screen.getByLabelText("Sáb 24"));
    await waitFor(() => {
      expect(screen.getByText("El sábado 24 no tienes clases")).toBeOnTheScreen();
    });
    expect(
      screen.getByText("Elige otro día de la semana o vuelve a tus clases de hoy."),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Ver mis clases de hoy" }));
    expect(screen.getByLabelText("Hoy 21")).toHaveProp("accessibilityState", { selected: true });

    await fireEvent.press(screen.getByLabelText("Sáb 24"));
    await fireEvent.press(screen.getByRole("button", { name: "Hoy" }));
    expect(screen.getByLabelText("Hoy 21")).toHaveProp("accessibilityState", { selected: true });
  });
});
