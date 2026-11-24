import { EmptyState, spacing } from "@pilates/mobile-core";
import {
  NavigationContext,
  useNavigation,
  type NavigationProp,
  type ParamListBase,
} from "@react-navigation/native";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { SessionDetailScreen } from "./session-detail-screen";
import { InSessionPanel } from "./session-panel-context";

/**
 * Reservar's detail panel on a tablet (03T/04T): the class detail as the
 * phone pushes it, kept beside the list. Its «back» closes the panel; every
 * other move (a booking's way to Mis reservas, Plans, the payment) leaves
 * Reservar as on a phone, and a booking also closes the panel.
 */
export function SessionPanel({
  onClose,
  sessionId,
}: {
  onClose: () => void;
  sessionId: string | null;
}) {
  const parent = useNavigation<NavigationProp<ParamListBase>>();
  const navigation = useMemo(
    () =>
      ({
        ...parent,
        goBack: onClose,
        navigate: (name: string, params?: object) => {
          if (name === "Bookings") onClose();
          parent.navigate(name, params);
        },
      }) as unknown as NavigationProp<ParamListBase>,
    [onClose, parent],
  );

  if (sessionId === null) {
    return (
      <View style={styles.empty} testID="session-panel-empty">
        <EmptyState
          icon="calendar"
          message="Toca una clase de la lista para ver el detalle y reservarla aquí."
          title="Elige una clase"
          variant="panel"
        />
      </View>
    );
  }
  return (
    <InSessionPanel value>
      <NavigationContext.Provider value={navigation}>
        <SessionDetailScreen key={sessionId} route={{ params: { sessionId } }} />
      </NavigationContext.Provider>
    </InSessionPanel>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, justifyContent: "center", padding: spacing.xxl },
});
