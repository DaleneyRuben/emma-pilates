import {
  CommonActions,
  type NavigationProp,
  type ParamListBase,
} from "@react-navigation/native";

import type { ConfirmedBooking } from "./assistant-session-detail-screen";
import type { ClientContext } from "./client-overview-screen";

// After booking or rescheduling for a Client, the Assistant lands on her
// Bookings with the overview directly beneath, so "Volver" never returns to
// the Session they just acted on.
export function showClientBookings(
  navigation: Pick<NavigationProp<ParamListBase>, "dispatch">,
  params: ClientContext & { confirmed: ConfirmedBooking },
) {
  navigation.dispatch((state) => {
    const names = state.routes.map((route) => route.name);
    const overview = names.lastIndexOf("ClientOverview");
    const routes = [
      ...state.routes.slice(0, overview + 1),
      { name: "ClientBookings", params },
    ];
    return CommonActions.reset({ ...state, index: routes.length - 1, routes });
  });
}
