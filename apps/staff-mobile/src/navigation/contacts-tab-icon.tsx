import { useListContactAlerts } from "@pilates/api-contracts";
import { UnreadCountPill } from "@pilates/mobile-core";
import { StyleSheet, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { StaffTabIcon } from "./staff-tab-icon";

// HOR/S28: the Coordinator's «Para contactar» tab carries how many Clients wait.
export function ContactsTabIcon({ color, focused }: { color: string; focused: boolean }) {
  const fetcher = useStaffFetcher();
  const alerts = useListContactAlerts({ fetcher });
  const count = alerts.data?.status === 200 ? alerts.data.data.totalItems : 0;
  return (
    <View>
      <StaffTabIcon color={color} focused={focused} name="contacts" />
      <View pointerEvents="none" style={styles.badge}>
        <UnreadCountPill count={count} ring testID="contact-list-count" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { left: 14, position: "absolute", top: -6 },
});
