import { colors, Glyph, type MobileImpersonation, spacing, Text } from "@pilates/mobile-core";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { staffRoleLabel } from "@pilates/api-contracts";

const minute = 60_000;

export const impersonationBannerHeight = 52;

export function minutesLeft(expiresAt: string, now: number): number {
  return Math.max(0, Math.floor((new Date(expiresAt).getTime() - now) / minute));
}

// Follow-up 108: the fixed Palo de rosa profundo strip above every screen
// while an Administrator sees the app as a Staff Member (ADR-0100).
export function ImpersonationBanner({
  impersonation,
  onExit,
  onExpire,
}: {
  impersonation: MobileImpersonation;
  onExit: () => void;
  onExpire: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const expiresAt = new Date(impersonation.expiresAt).getTime();

  // The minutes tick down, and the expiry returns the Administrator on its own.
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    const expiry = setTimeout(onExpire, Math.max(0, expiresAt - Date.now()));
    return () => {
      clearInterval(tick);
      clearTimeout(expiry);
    };
  }, [expiresAt, onExpire]);

  const name = impersonation.staffMemberName;
  const insets = useSafeAreaInsets();
  return (
    <View accessibilityRole="header" style={[styles.strip, { paddingTop: insets.top }]}>
      <View style={styles.row}>
        <Glyph color={colors.white} name="eye" size={18} strokeWidth={1.6} />
        <View style={styles.text}>
          <Text numberOfLines={1} tone="onDark" variant="titulo-fila">
            {`Viendo como ${name}`}
          </Text>
          <Text numberOfLines={1} tone="onDark" variant="secundario">
            {`${staffRoleLabel(impersonation.role, impersonation.gender)} · Quedan ${minutesLeft(impersonation.expiresAt, now)} min`}
          </Text>
        </View>
        <Pressable
          accessibilityLabel={`Salir de ver como ${name}`}
          accessibilityRole="button"
          onPress={onExit}
          style={({ pressed }) => [styles.exit, pressed && styles.exitPressed]}
          testID="impersonation-exit"
        >
          <Text tone="onDark" variant="boton-chico">
            Salir
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// Rosa Emma (E-D25): the 600 strip with white text and an outlined «Salir»
// (`boton-chico`: a small button, not a link).
const styles = StyleSheet.create({
  exit: {
    alignItems: "center",
    borderColor: colors.white,
    borderRadius: spacing.md,
    borderWidth: 1.5,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: spacing.lg,
  },
  exitPressed: { opacity: 0.7 },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.smLg,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  // Over the top inset; navigation.tsx pushes the screens down by the inset
  // plus the strip, so their own safe-area views add nothing more.
  strip: { backgroundColor: colors.emphasis, left: 0, position: "absolute", right: 0, top: 0 },
  text: { flex: 1 },
});
