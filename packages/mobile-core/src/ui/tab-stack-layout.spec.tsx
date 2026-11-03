import { render } from "@testing-library/react-native";

import { Screen } from "./screen";
import { tabStackScreenLayout } from "./tab-stack-layout";

const edgesOf = (element: { props: { edges?: Record<string, string> } }) =>
  Object.entries(element.props.edges ?? {})
    .filter(([, mode]) => mode !== "off")
    .map(([edge]) => edge);

const navigationWithRoot = (key: string) => ({ getState: () => ({ routes: [{ key }] }) });

// A tab's root sits over the tab bar (FIX-023); a pushed screen hides the bar,
// so it keeps the bottom safe area or its fixed button sits under the home
// indicator (Mi plan's «Reservar una clase» on the iPhone, MOB-074 walk).
describe("tabStackScreenLayout", () => {
  it("drops the bottom safe area on the tab's root screen", async () => {
    const screen = await render(
      tabStackScreenLayout({
        children: <Screen testID="app-screen" />,
        navigation: navigationWithRoot("home"),
        route: { key: "home" },
      }),
    );

    expect(edgesOf(screen.getByTestId("app-screen"))).toEqual(["top", "right", "left"]);
  });

  it("keeps the bottom safe area on a pushed screen", async () => {
    const screen = await render(
      tabStackScreenLayout({
        children: <Screen testID="app-screen" />,
        navigation: navigationWithRoot("home"),
        route: { key: "subscription" },
      }),
    );

    expect(edgesOf(screen.getByTestId("app-screen"))).toEqual(["top", "right", "bottom", "left"]);
  });
});
