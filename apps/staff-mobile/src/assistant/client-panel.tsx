import { BodyText, colors, spacing, typography } from "@pilates/mobile-core";
import {
  NavigationContext,
  useNavigation,
  type NavigationProp,
  type ParamListBase,
} from "@react-navigation/native";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import {
  InClientPanel,
  useAssistantWorkspace,
  type ClientPanel,
} from "./assistant-workspace";
import { ClientBookingsScreen } from "./client-bookings-screen";
import { ClientHistoryScreen } from "./client-history-screen";
import { ClientOverviewScreen } from "./client-overview-screen";

const panelViews: Record<string, ClientPanel["view"]> = {
  ClientBookings: "bookings",
  ClientHistory: "history",
  ClientOverview: "overview",
};

// The tablet detail panel. The Client screens keep calling navigation as on a
// phone; moves between overview, Bookings, and history stay in the panel and
// everything else goes to the Assistant stack as a full screen.
export function ClientDetailPanel() {
  const parent = useNavigation<NavigationProp<ParamListBase>>();
  const { opened, panel, show } = useAssistantWorkspace();

  const navigation = useMemo(() => {
    const navigate = (name: string, params?: Record<string, unknown>) => {
      const view = panelViews[name];
      if (view === undefined) {
        parent.navigate(name, params);
        return;
      }
      show({ ...(params ?? {}), view } as ClientPanel);
    };
    return {
      ...parent,
      goBack: () =>
        show(
          panel === null || panel.view === "overview"
            ? null
            : { view: "overview", clientId: panel.clientId },
        ),
      navigate,
      popToTop: () => show(null),
      setParams: (params: Record<string, unknown>) =>
        panel === null ? undefined : show({ ...panel, ...params } as ClientPanel),
    } as unknown as NavigationProp<ParamListBase>;
  }, [panel, parent, show]);

  if (panel === null) {
    return (
      <View style={styles.empty}>
        <BodyText style={styles.emptyText}>
          Selecciona un cliente para ver sus detalles
        </BodyText>
      </View>
    );
  }

  // A reopened invitation (S05, same email) remounts the overview already shown.
  const reopened = panel.view === "overview" && panel.reopened === true;
  const key = `${panel.view}:${panel.clientId}${reopened ? `:${opened}` : ""}`;
  return (
    <InClientPanel value>
      <NavigationContext.Provider value={navigation}>
        {panel.view === "overview" ? (
          <ClientOverviewScreen key={key} route={{ params: panel }} />
        ) : panel.view === "bookings" ? (
          <ClientBookingsScreen key={key} route={{ params: panel }} />
        ) : (
          <ClientHistoryScreen key={key} route={{ params: panel }} />
        )}
      </NavigationContext.Provider>
    </InClientPanel>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    margin: spacing.lg,
    padding: spacing.xl,
  },
  emptyText: { color: colors.textMuted, fontSize: typography.bodyLarge, textAlign: "center" },
});
