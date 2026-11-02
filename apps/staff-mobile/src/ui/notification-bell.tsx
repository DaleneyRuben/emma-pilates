import { useGetUnreadNotificationCount } from "@pilates/api-contracts";
import { colors, Glyph, radii, unreadCountLabel } from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { Pressable, StyleSheet, Text } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";

type BellNavigation = { navigate: (screen: "Notifications") => void };

/**
 * The bell on a role root (v2 S02, S04, S11, S15): a 44 pt Lino disc with the
 * unread count in Rosa profundo. Perfil is a tab now, so the avatar is gone.
 */
export function NotificationBell() {
  const navigation = useNavigation<BellNavigation>();
  const fetcher = useStaffFetcher();
  const unread = useGetUnreadNotificationCount({
    fetcher,
    query: { refetchOnMount: "always" },
  });
  const count = unread.data?.status === 200 ? unread.data.data.unread : 0;
  return (
    <Pressable
      accessibilityLabel={count > 0 ? `Notificaciones, ${count} sin leer` : "Notificaciones"}
      accessibilityRole="button"
      onPress={() => navigation.navigate("Notifications")}
      style={({ pressed }) => [styles.bell, pressed && styles.pressed]}
      testID="notification-bell"
    >
      <Glyph color={colors.emphasis} name="bell" size={20} strokeWidth={1.6} />
      {count > 0 ? (
        <Text style={styles.count} testID="notification-bell-count">
          {unreadCountLabel(count)}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bell: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radii.pill,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  count: {
    backgroundColor: colors.emphasis,
    borderRadius: radii.pill,
    color: colors.white,
    fontSize: 11,
    fontWeight: "600",
    height: 18,
    lineHeight: 18,
    minWidth: 18,
    overflow: "hidden",
    paddingHorizontal: 4,
    position: "absolute",
    right: 2,
    textAlign: "center",
    top: 2,
  },
  pressed: { opacity: 0.7 },
});
