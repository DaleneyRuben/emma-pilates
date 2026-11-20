import { cleanup, render, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../App";
import { createClientRuntime, jsonResponse, routeFetcher } from "./test-support";

jest.setTimeout(20_000);

const hidden = { includeHiddenElements: true };

// Follow-up 285: the tab labels are `pastilla` (Work Sans 12 · 700), white on
// the open tab's 600 pill and ink on the others, in the same weight.
describe("The Client tab bar", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("writes its labels in Work Sans 12 · 700, the open tab in white", async () => {
    const fetcher = routeFetcher({
      "/api/v1/clients/current": () =>
        jsonResponse({
          id: "client-1",
          name: "Carla Ruiz",
          email: "carla@example.com",
          phone: null,
          referralCode: "REF-CARLA",
        }),
      "/api/v1/clients/current/subscription": () =>
        jsonResponse({ status: "none", subscription: null }),
    });
    const screen = await render(<App runtime={createClientRuntime(fetcher)} />);

    await waitFor(() => expect(screen.getByTestId("tab-home", hidden)).toBeOnTheScreen(), {
      timeout: 10_000,
    });
    const open = within(screen.getByTestId("tab-home", hidden)).getByText("Inicio", hidden);
    const closed = within(screen.getByTestId("tab-booking", hidden)).getByText("Reservar", hidden);
    expect(open).toHaveStyle({ color: "#FFFBFB", fontFamily: "WorkSans_700Bold" });
    expect(closed).toHaveStyle({ color: "#93615D", fontFamily: "WorkSans_700Bold" });
    expect(closed).toHaveStyle({ fontSize: 12 });
  });
});
