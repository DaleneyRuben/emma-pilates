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

// UX-007: S02 draws «Entrenadora» over the greeting and names each chip
// «Mié 21», so Saturday and Sunday are not bare numbers.
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

  it("puts the Entrenadora eyebrow over the greeting", async () => {
    const screen = await renderTrainer();

    await waitFor(() => {
      expect(screen.getByLabelText("Mi agenda")).toHaveTextContent("Hola, Emma");
    });
    expect(screen.getByText("Entrenadora")).toBeOnTheScreen();
  });

  it("names each day chip with its weekday and day number", async () => {
    const screen = await renderTrainer();

    await waitFor(() => {
      expect(screen.getByLabelText("Mié 21")).toBeOnTheScreen();
    });
    expect(screen.getByLabelText("Lun 19")).toBeOnTheScreen();
    expect(screen.getByLabelText("Sáb 24")).toBeOnTheScreen();
    expect(screen.getByLabelText("Dom 25")).toBeOnTheScreen();
    expect(screen.queryByLabelText("2026-10-21")).toBeNull();

    await fireEvent.press(screen.getByLabelText("Sáb 24"));
    expect(screen.getByLabelText("Sáb 24")).toHaveProp("accessibilityState", { selected: true });
    expect(screen.queryByLabelText("2026-10-24")).toBeNull();
    expect(screen.queryByLabelText("2026-10-25")).toBeNull();
  });

  // UX-015: the day number sits under the weekday. A fixed line box clips it
  // on Android, so neither line fixes its height.
  it("lets the day number grow under the weekday", async () => {
    const screen = await renderTrainer();

    await waitFor(() => {
      expect(screen.getByText("21")).toBeOnTheScreen();
    });
    expect(screen.getByText("21")).not.toHaveStyle({ lineHeight: 18 });
    expect(screen.getByText("Mié").parent).not.toHaveStyle({
      paddingVertical: 12,
    });
  });
});
