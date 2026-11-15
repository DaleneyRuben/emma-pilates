import { CommonActions, StackActions } from "@react-navigation/native";

import { popTabToRootOnPress, returnTabsToRoot } from "./tab-press";

// Walkthrough n.º 28: tapping a tab opens it on its root screen. Only the tap
// does: the app's own move to another tab keeps the stack it left, so
// «Volver» can come back to it.
describe("popTabToRootOnPress", () => {
  it("pops the tab's stack to its root when the tab is tapped", () => {
    const dispatch = jest.fn();
    const listeners = popTabToRootOnPress({
      navigation: { dispatch },
      route: {
        key: "booking",
        name: "Booking",
        state: { index: 1, key: "stack-booking" },
      } as never,
    });

    listeners.tabPress();

    expect(dispatch).toHaveBeenCalledWith({ ...StackActions.popToTop(), target: "stack-booking" });
  });

  it("leaves a tab already on its root, or never opened, alone", () => {
    const dispatch = jest.fn();

    popTabToRootOnPress({
      navigation: { dispatch },
      route: { key: "home", name: "HomeTab", state: { index: 0, key: "stack-home" } } as never,
    }).tabPress();
    popTabToRootOnPress({
      navigation: { dispatch },
      route: { key: "profile", name: "ProfileTab" },
    }).tabPress();

    expect(dispatch).not.toHaveBeenCalled();
  });
});

// Walkthrough n.º 55: a notification opens Mi plan in a Perfil tab never
// opened before, so Mi plan is that stack's only screen and the tab route
// carries no stack state, only the screen it was asked for.
describe("returnTabsToRoot", () => {
  const roots = { HomeTab: "Home", ProfileTab: "Profile" };

  it("opens the tab on its root when a notification left another screen alone in it", () => {
    const dispatch = jest.fn();
    const preventDefault = jest.fn();

    returnTabsToRoot(roots)({
      navigation: { dispatch },
      route: {
        key: "profile",
        name: "ProfileTab",
        params: { screen: "Subscription" },
      } as never,
    }).tabPress({ preventDefault });

    expect(preventDefault).toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledWith(
      CommonActions.navigate({
        name: "ProfileTab",
        params: { state: { routes: [{ name: "Profile" }] } },
      }),
    );
  });

  it("still pops a stack it can see, and leaves a tab on its root alone", () => {
    const dispatch = jest.fn();
    const preventDefault = jest.fn();

    returnTabsToRoot(roots)({
      navigation: { dispatch },
      route: {
        key: "profile",
        name: "ProfileTab",
        state: { index: 1, key: "stack-profile" },
      } as never,
    }).tabPress({ preventDefault });
    returnTabsToRoot(roots)({
      navigation: { dispatch },
      route: { key: "home", name: "HomeTab", params: { screen: "Home" } } as never,
    }).tabPress({ preventDefault });

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({ ...StackActions.popToTop(), target: "stack-profile" });
    expect(preventDefault).not.toHaveBeenCalled();
  });
});
