import {
  useGetCurrentStaffMemberProfile,
  useGetUnreadNotificationCount,
} from "@pilates/api-contracts";
import { colors, initials, radii, spacing } from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";

type AvatarNavigation = { navigate: (screen: "Profile") => void };

export function AccountAvatar() {
  const navigation = useNavigation<AvatarNavigation>();
  const fetcher = useStaffFetcher();
  const profile = useGetCurrentStaffMemberProfile({ fetcher });
  const unread = useGetUnreadNotificationCount({
    fetcher,
    query: { refetchOnMount: "always" },
  });
  const name = profile.data?.status === 200 ? profile.data.data.name : "";
  const unreadCount =
    unread.data?.status === 200 ? unread.data.data.unread : 0;

  return (
    <Pressable
      accessibilityLabel="Tu cuenta"
      accessibilityRole="button"
      hitSlop={spacing.xs}
      onPress={() => navigation.navigate("Profile")}
      style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}
    >
      <Text style={styles.initials}>{initials(name)}</Text>
      {unreadCount > 0 ? <View style={styles.dot} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    backgroundColor: colors.secondaryAccent,
    borderRadius: radii.pill,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  dot: {
    backgroundColor: colors.error,
    borderColor: colors.background,
    borderRadius: radii.pill,
    borderWidth: 2,
    height: 12,
    position: "absolute",
    right: 0,
    top: 0,
    width: 12,
  },
  initials: { color: colors.white, fontSize: 16, fontWeight: "600" },
  pressed: { backgroundColor: colors.primary },
});
