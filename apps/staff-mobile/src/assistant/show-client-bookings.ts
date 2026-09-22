import {
  CommonActions,
  StackActions,
  useNavigation,
  type NavigationProp,
  type ParamListBase,
} from "@react-navigation/native";

import type { ConfirmedBooking } from "./assistant-session-detail-screen";
import { useAssistantWorkspace } from "./assistant-workspace";
import type { ClientContext } from "./client-overview-screen";

// After booking or rescheduling for a Client, the Assistant lands on her
// Bookings with the overview directly beneath, so "Volver" never returns to
// the Session they just acted on. On a tablet her Bookings open in the panel
// beside Client Search.
export function useShowClientBookings() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const workspace = useAssistantWorkspace();
  return (params: ClientContext & { confirmed: ConfirmedBooking }) => {
    if (workspace.split) {
      workspace.show({ view: "bookings", ...params });
      navigation.dispatch(StackActions.popTo("ClientSearch"));
      return;
    }
    navigation.dispatch((state) => {
      const names = state.routes.map((route) => route.name);
      const overview = names.lastIndexOf("ClientOverview");
      const routes = [
        ...state.routes.slice(0, overview + 1),
        { name: "ClientBookings", params },
      ];
      return CommonActions.reset({ ...state, index: routes.length - 1, routes });
    });
  };
}
