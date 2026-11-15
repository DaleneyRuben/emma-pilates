import {
  CommonActions,
  type NavigationAction,
  type ParamListBase,
  type RouteProp,
  StackActions,
} from "@react-navigation/native";

type TabListenerProps = {
  navigation: { dispatch: (action: NavigationAction) => void };
  route: RouteProp<ParamListBase>;
};

// A tab's route carries its nested stack's state at run time, though
// RouteProp does not declare it.
type TabRoute = {
  name: string;
  params?: { screen?: unknown };
  state?: Readonly<{ index?: number; key?: string }>;
};

function tabPressListeners({ navigation, route }: TabListenerProps, root: string | undefined) {
  return {
    tabPress: (event?: { preventDefault: () => void }) => {
      const tab = route as TabRoute;
      const stack = tab.state;
      if (stack === undefined) {
        // Walkthrough n.º 55: a notification that opens a screen in a tab
        // never opened before starts its stack on that screen alone, and
        // React Navigation keeps that first state inside the stack, so the
        // tab cannot pop it. Opening the tab with its root as the stack's
        // whole state replaces it.
        const screen = tab.params?.screen;
        if (root === undefined || typeof screen !== "string" || screen === root) return;
        event?.preventDefault();
        navigation.dispatch(
          CommonActions.navigate({
            name: tab.name,
            params: { state: { routes: [{ name: root }] } },
          }),
        );
        return;
      }
      if (stack.key === undefined || (stack.index ?? 0) === 0) return;
      navigation.dispatch({ ...StackActions.popToTop(), target: stack.key });
    },
  };
}

/**
 * A bottom tab's `screenListeners` (walkthrough n.º 28, owner: «es poco
 * intuitivo»): tapping a tab pops its stack to the root screen, so Reservar
 * opens on the day strip, not on the last class seen. Only the tap does it;
 * the app's own move to another tab (a notification, a booking) keeps the
 * stack it left, so «Volver» still returns to it. The root screen stays
 * mounted, so its own state (the chosen day) is kept.
 */
export function popTabToRootOnPress(props: TabListenerProps) {
  return tabPressListeners(props, undefined);
}

/**
 * `popTabToRootOnPress` for tabs whose root screens it is told, by tab name,
 * so it also returns a tab that a notification opened on another screen to
 * its root (walkthrough n.º 55).
 */
export function returnTabsToRoot(roots: Readonly<Record<string, string>>) {
  return (props: TabListenerProps) => tabPressListeners(props, roots[props.route.name]);
}
