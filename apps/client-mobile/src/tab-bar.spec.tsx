import { cleanup, render, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../App";
import { createClientRuntime, jsonResponse, routeFetcher } from "./test-support";

jest.setTimeout(20_000);

const hidden = { includeHiddenElements: true };

// FIX-089: the tab labels are Work Sans at 12 pt or more in Rosa profundo,
// the open tab in weight rather than in another colour.
describe("The Client tab bar", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("writes its labels in Work Sans, the open tab in bold", async () => {
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
    expect(open).toHaveStyle({ color: "#93615D", fontFamily: "WorkSans_600SemiBold" });
    expect(closed).toHaveStyle({ color: "#93615D", fontFamily: "WorkSans_400Regular" });
    expect(closed).toHaveStyle({ fontSize: 12 });
  });
});
