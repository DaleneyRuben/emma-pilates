import {
  type NavigationAction,
  type ParamListBase,
  type RouteProp,
  StackActions,
} from "@react-navigation/native";

/**
 * A bottom tab's `screenListeners` (walkthrough n.º 28, owner: «es poco
 * intuitivo»): tapping a tab pops its stack to the root screen, so Reservar
 * opens on the day strip, not on the last class seen. Only the tap does it;
 * the app's own move to another tab (a notification, a booking) keeps the
 * stack it left, so «Volver» still returns to it. The root screen stays
 * mounted, so its own state (the chosen day) is kept.
 */
export function popTabToRootOnPress({
  navigation,
  route,
}: {
  navigation: { dispatch: (action: NavigationAction) => void };
  route: RouteProp<ParamListBase>;
}) {
  return {
    tabPress: () => {
      // A tab's route carries its nested stack's state at run time, though
      // RouteProp does not declare it.
      const stack = (route as { state?: Readonly<{ index?: number; key?: string }> }).state;
      if (stack?.key === undefined || (stack.index ?? 0) === 0) return;
      navigation.dispatch({ ...StackActions.popToTop(), target: stack.key });
    },
  };
}
