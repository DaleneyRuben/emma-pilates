import { useGetUnreadNotificationCount } from "@pilates/api-contracts";
import { UnreadCountPill } from "@pilates/mobile-core";
import type { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { Pressable, StyleSheet, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";

// Follow-up 73: the Perfil tab carries the unread count and says it. It
// refreshes with the unread-count query, which the inbox invalidates and the
// query layer refetches when the app returns to the foreground.
export function ProfileTabButton({
  accessibilityLabel,
  "aria-label": ariaLabel,
  children,
  href: _href,
  pressColor: _pressColor,
  pressOpacity: _pressOpacity,
  ref: _ref,
  style,
  ...pressable
}: BottomTabBarButtonProps) {
  const fetcher = useClientFetcher();
  const unread = useGetUnreadNotificationCount({ fetcher });
  const count = unread.data?.status === 200 ? unread.data.data.unread : 0;
  // React Navigation names the tab «Perfil, tab, 4 of 4» on iOS.
  const base = ariaLabel ?? accessibilityLabel ?? "Perfil";
  const label =
    count > 0
      ? base.replace(
          /^Perfil/,
          `Perfil, ${count} ${count === 1 ? "notificación sin leer" : "notificaciones sin leer"}`,
        )
      : base;

  return (
    <Pressable {...pressable} aria-label={label} style={style}>
      {children}
      <View pointerEvents="none" style={styles.badge}>
        <UnreadCountPill count={count} ring testID="profile-tab-badge" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: { left: "50%", marginLeft: 4, position: "absolute", top: 2 },
});
