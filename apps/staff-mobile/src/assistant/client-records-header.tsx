import { SegmentedTabs, spacing } from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { StyleSheet, View } from "react-native";

import { BackBar } from "../ui/back-bar";
import { useInClientPanel } from "./assistant-workspace";
import type { ClientContext } from "./client-overview-screen";

type RecordsNavigation = {
  goBack: () => void;
  navigate: (screen: "ClientBookings" | "ClientHistory", params: ClientContext) => void;
  replace: (screen: "ClientBookings" | "ClientHistory", params: ClientContext) => void;
};

/**
 * S21 and S22's top (walkthrough 8 and 17): back to her file, «Reservas de
 * Lucía», and Próximas | Historial. A tab swaps the screen in place; beside
 * the search on a tablet the panel swaps its view instead.
 */
export function ClientRecordsHeader({
  context,
  selected,
}: {
  context: ClientContext;
  selected: "upcoming" | "history";
}) {
  const navigation = useNavigation<RecordsNavigation>();
  const inPanel = useInClientPanel();
  const firstName = context.clientName.trim().split(/\s+/)[0] ?? context.clientName;
  const open = (key: "upcoming" | "history") => {
    if (key === selected) return;
    const screen = key === "upcoming" ? "ClientBookings" : "ClientHistory";
    if (inPanel) navigation.navigate(screen, context);
    else navigation.replace(screen, context);
  };
  return (
    <View style={styles.header}>
      <BackBar
        back={context.clientName}
        onBack={() => navigation.goBack()}
        title={`Reservas de ${firstName}`}
      />
      <SegmentedTabs
        accessibilityLabel="Reservas"
        onSelect={open}
        options={[
          { key: "upcoming", label: "Próximas", testID: "client-records-upcoming" },
          { key: "history", label: "Historial", testID: "client-records-history" },
        ]}
        selected={selected}
      />
    </View>
  );
}

const styles = StyleSheet.create({ header: { gap: spacing.lg } });
