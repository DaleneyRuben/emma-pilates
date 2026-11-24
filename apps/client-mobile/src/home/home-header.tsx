import { useGetUnreadNotificationCount, type ClientProfileDto } from "@pilates/api-contracts";
import {
  colors,
  formatSessionDate,
  Glyph,
  radii,
  ScreenHeader,
  spacing,
  UnreadCountPill,
} from "@pilates/mobile-core";
import { Pressable, StyleSheet, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";
import { ClientAvatar } from "../profile/client-avatar";
import { useClientPhoto } from "../profile/use-client-photo";
import { firstName } from "./home-format";

function todayLabel(now: Date): string {
  const label = formatSessionDate(now.toISOString());
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function bellLabel(unread: number): string {
  return unread > 0 ? `Notificaciones, ${unread} sin leer` : "Notificaciones";
}

/**
 * 02's top (Rosa Emma C02): the band with today's date on a white capsule,
 * the bell on a white disc with the unread pill and the avatar, then the
 * greeting. The unread count lives here, not on the
 * Perfil tab (walkthrough n.º 11).
 */
export function HomeHeader({
  onNotifications,
  onProfile,
  profile,
}: {
  onNotifications: () => void;
  onProfile: () => void;
  profile: ClientProfileDto;
}) {
  const fetcher = useClientFetcher();
  const unread = useGetUnreadNotificationCount({ fetcher });
  const count = unread.data?.status === 200 ? unread.data.data.unread : 0;
  const photoUri = useClientPhoto(profile.photo?.imageAssetId ?? null);

  return (
    <ScreenHeader
      action={
        <View style={styles.actions}>
          <Pressable
            accessibilityLabel={bellLabel(count)}
            accessibilityRole="button"
            onPress={onNotifications}
            style={({ pressed }) => [styles.bell, pressed && styles.pressed]}
            testID="home-bell"
          >
            <Glyph color={colors.text} name="bell" size={22} strokeWidth={1.7} />
            <View pointerEvents="none" style={styles.badge}>
              <UnreadCountPill count={count} ring testID="home-bell-badge" />
            </View>
          </Pressable>
          <Pressable
            accessibilityLabel="Tu perfil"
            accessibilityRole="button"
            onPress={onProfile}
            style={({ pressed }) => pressed && styles.pressed}
            testID="home-avatar"
          >
            <ClientAvatar name={profile.name} photoUri={photoUri} size={44} />
          </Pressable>
        </View>
      }
      eyebrow={todayLabel(new Date())}
      tabletWidth={720}
      testID="home-header"
      title={`Hola, ${firstName(profile.name)}`}
      titleLabel="Inicio"
    />
  );
}

const styles = StyleSheet.create({
  actions: { alignItems: "center", flexDirection: "row", gap: spacing.smLg },
  badge: { position: "absolute", right: -spacing.xs, top: -spacing.xs },
  bell: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radii.pill,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  pressed: { opacity: 0.7 },
});
