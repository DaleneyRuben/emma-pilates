import { colors, Glyph, type MobileImpersonation, spacing, typography } from "@pilates/mobile-core";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { roleLabel } from "../profile/staff-labels";

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
  return (
    <SafeAreaView accessibilityRole="header" edges={["top"]} style={styles.strip}>
      <View style={styles.row}>
        <Glyph color={colors.white} name="eye" size={16} strokeWidth={1.5} />
        <View style={styles.text}>
          <Text numberOfLines={1} style={styles.title}>{`Viendo como ${name}`}</Text>
          <Text numberOfLines={1} style={styles.detail}>
            {`${roleLabel(impersonation.role)} · Quedan ${minutesLeft(impersonation.expiresAt, now)} min`}
          </Text>
        </View>
        <Pressable
          accessibilityLabel={`Salir de ver como ${name}`}
          accessibilityRole="button"
          onPress={onExit}
          style={({ pressed }) => [styles.exit, pressed && styles.exitPressed]}
          testID="impersonation-exit"
        >
          <Text style={styles.exitText}>Salir</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  detail: { color: colors.white, fontSize: typography.label, opacity: 0.85 },
  exit: {
    alignItems: "center",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacing.sm,
  },
  exitPressed: { backgroundColor: "rgba(255,255,255,0.14)" },
  exitText: { color: colors.white, fontSize: typography.note, fontWeight: "600" },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  // Over the top inset: the screen under it keeps its own safe-area padding
  // and the wrapper pushes it down by the strip's 52 px (navigation.tsx).
  strip: { backgroundColor: colors.primaryDeep, left: 0, position: "absolute", right: 0, top: 0 },
  text: { flex: 1, gap: 2 },
  title: { color: colors.white, fontSize: typography.note, fontWeight: "500" },
});
