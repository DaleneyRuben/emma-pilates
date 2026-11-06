import { StackActions } from "@react-navigation/native";

import { popTabToRootOnPress } from "./tab-press";

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
