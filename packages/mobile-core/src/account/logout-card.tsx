import { Pressable, StyleSheet } from "react-native";

import { Glyph } from "../ui/glyph";
import { Text } from "../ui/text";
import { colors, spacing, surfaces } from "../ui/tokens";

/**
 * «Cerrar sesión» at the very bottom of Perfil in both apps (C18s, E-F23;
 * follow-up 292): a white card of its own, the icon and label centred in
 * Destructivo, 24 pt below the card before it. It opens «¿Cerrar sesión?».
 */
export function LogoutCard({
  onPress,
  screenGap = spacing.md,
}: {
  onPress: () => void;
  /** The gap the screen already leaves between its cards; the card adds the rest of the 24 pt. */
  screenGap?: number;
}) {
  return (
    <Pressable
      accessibilityLabel="Cerrar sesión"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { marginTop: spacing.xl - screenGap },
        pressed && styles.pressed,
      ]}
      testID="profile-logout"
    >
      <Glyph color={colors.destructivo} name="logout" size={20} strokeWidth={1.7} />
      <Text tone="destructivo" variant="boton">
        Cerrar sesión
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    ...surfaces.card,
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.smLg,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.mdLg,
  },
  pressed: { opacity: 0.7 },
});
