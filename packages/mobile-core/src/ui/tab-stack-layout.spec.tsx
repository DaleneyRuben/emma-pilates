import { render } from "@testing-library/react-native";

import { Screen } from "./screen";
import { createTabStackScreenLayout, tabBarHidden, tabStackScreenLayout } from "./tab-stack-layout";

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

// Design follow-up 254 § 3: the bar stays on browsing screens and hides only
// inside a task, so only a task keeps the bottom safe area itself.
describe("createTabStackScreenLayout", () => {
  const layout = createTabStackScreenLayout(new Set(["EditProfile"]));

  it("drops the bottom safe area on a pushed browsing screen, which keeps the bar", async () => {
    const screen = await render(
      layout({
        children: <Screen testID="app-screen" />,
        navigation: navigationWithRoot("home"),
        route: { key: "notifications", name: "Notifications" },
      }),
    );

    expect(edgesOf(screen.getByTestId("app-screen"))).toEqual(["top", "right", "left"]);
  });

  it("keeps the bottom safe area inside a task, which hides the bar", async () => {
    const screen = await render(
      layout({
        children: <Screen testID="app-screen" />,
        navigation: navigationWithRoot("home"),
        route: { key: "edit", name: "EditProfile" },
      }),
    );

    expect(edgesOf(screen.getByTestId("app-screen"))).toEqual(["top", "right", "bottom", "left"]);
  });
});

describe("tabBarHidden", () => {
  const tasks = new Set(["CashClose", "EditProfile"]);

  it("hides the bar inside a task", () => {
    expect(tabBarHidden(tasks, "EditProfile", "Profile")).toBe(true);
  });

  it("keeps it on a browsing screen", () => {
    expect(tabBarHidden(tasks, "Notifications", "Profile")).toBe(false);
  });

  it("keeps it on a tab root even when another tab pushes it as a task", () => {
    expect(tabBarHidden(tasks, "CashClose", "CashClose")).toBe(false);
  });
});
