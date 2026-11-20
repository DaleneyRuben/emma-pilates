import { useGetUnreadNotificationCount } from "@pilates/api-contracts";
import { colors, Glyph, radii, Text, unreadCountLabel } from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { Pressable, StyleSheet, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";

type BellNavigation = { navigate: (screen: "Notifications") => void };

/**
 * The bell on a role root (Rosa Emma): a 44 pt white disc on the band and
 * the unread count in rosa profundo with white. Perfil is a tab
 * now, so the avatar is gone.
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
      <Glyph color={colors.text} name="bell" size={20} strokeWidth={1.6} />
      {count > 0 ? (
        <View style={styles.count}>
          <Text testID="notification-bell-count" tone="onDark" variant="pastilla">
            {unreadCountLabel(count)}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bell: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  // The count rides a 600 disc: white `pastilla`, the disc grows with it.
  count: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    justifyContent: "center",
    minHeight: 18,
    minWidth: 18,
    paddingHorizontal: 4,
    position: "absolute",
    right: 2,
    top: 2,
  },
  pressed: { opacity: 0.7 },
});
