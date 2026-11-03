import { useGetUnreadNotificationCount, type ClientProfileDto } from "@pilates/api-contracts";
import {
  colors,
  fontFamilies,
  formatSessionDate,
  Glyph,
  radii,
  spacing,
  typography,
  UnreadCountPill,
} from "@pilates/mobile-core";
import { Pressable, StyleSheet, Text, View } from "react-native";

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
 * 02's top (follow-up 225 §10): today's date and the greeting, then the bell
 * with the unread pill and the avatar. The unread count lives here, not on the
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
    <View style={styles.row}>
      <View style={styles.greeting}>
        <Text style={styles.date}>{todayLabel(new Date())}</Text>
        <Text accessibilityLabel="Inicio" accessibilityRole="header" style={styles.title}>
          {`Hola, ${firstName(profile.name)}`}
        </Text>
      </View>
      <Pressable
        accessibilityLabel={bellLabel(count)}
        accessibilityRole="button"
        onPress={onNotifications}
        style={({ pressed }) => [styles.bell, pressed && styles.pressed]}
        testID="home-bell"
      >
        <Glyph color={colors.emphasis} name="bell" size={20} strokeWidth={1.6} />
        <View pointerEvents="none" style={styles.badge}>
          <UnreadCountPill count={count} testID="home-bell-badge" />
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
  );
}

const styles = StyleSheet.create({
  badge: { position: "absolute", right: spacing.xs, top: spacing.xs },
  bell: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radii.pill,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  date: {
    color: colors.textMuted,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: typography.label,
    fontWeight: "500",
    letterSpacing: typography.label * 0.12,
    textTransform: "uppercase",
  },
  greeting: { flex: 1, gap: spacing.xs },
  pressed: { opacity: 0.7 },
  row: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  title: {
    color: colors.text,
    fontFamily: fontFamilies.display,
    fontSize: typography.title,
  },
});
