import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";
import { Dimensions } from "react-native";

import App from "../App";
import { createClientRuntime, jsonResponse, routeFetcher } from "./test-support";

jest.setTimeout(20_000);

const hidden = { includeHiddenElements: true };

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

function windowWidth(width: number) {
  jest.spyOn(Dimensions, "get").mockReturnValue({ fontScale: 1, height: 1194, scale: 2, width });
}

// Follow-up 289: on a tablet the four tabs sit centred in one 84 pt row, each
// icon beside its label; a phone keeps React Navigation's bar.
describe("The Client tab bar on a tablet", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
    jest.restoreAllMocks();
  });

  it("centres the tabs with the icon beside the label and opens the one pressed", async () => {
    windowWidth(834);
    const screen = await render(<App runtime={createClientRuntime(fetcher)} />);

    await waitFor(() => expect(screen.getByTestId("tablet-tab-bar", hidden)).toBeOnTheScreen(), {
      timeout: 10_000,
    });
    expect(screen.getByTestId("tablet-tab-bar", hidden)).toHaveStyle({
      flexDirection: "row",
      justifyContent: "center",
    });
    const home = screen.getByTestId("tab-home", hidden);
    expect(home).toHaveStyle({ flexDirection: "row", height: 48 });
    expect(within(home).getByText("Inicio", hidden)).toHaveStyle({ color: "#FFFBFB" });

    await fireEvent.press(screen.getByTestId("tab-profile", hidden));
    await waitFor(() => expect(screen.getByTestId("tab-profile", hidden)).toBeSelected());
  });

  it("keeps the phone's bar under 768 pt", async () => {
    windowWidth(390);
    const screen = await render(<App runtime={createClientRuntime(fetcher)} />);

    await waitFor(() => expect(screen.getByTestId("tab-home", hidden)).toBeOnTheScreen(), {
      timeout: 10_000,
    });
    expect(screen.queryByTestId("tablet-tab-bar", hidden)).toBeNull();
  });
});
