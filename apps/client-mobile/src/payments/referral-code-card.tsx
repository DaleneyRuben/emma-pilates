import {
  colors,
  EditReferralCode,
  fontFamilies,
  Glyph,
  PrimaryButton,
  radii,
  spacing,
  surfaces,
  typography,
} from "@pilates/mobile-core";
import * as Clipboard from "expo-clipboard";
import { Pressable, StyleSheet, Text, View } from "react-native";

/**
 * Invita option A (FIX-082, design audit 2026-11-18): one Lino card with the
 * code in Lora and an outlined copy icon, «Compartir tu código» right under
 * it as the screen's one solid action, and «Editar código» centred below.
 */
export function ReferralCodeCard({
  code,
  fetcher,
  onChanged,
  onCopied,
  onShare,
}: {
  code: string;
  fetcher: typeof fetch;
  onChanged: () => void;
  onCopied: () => void;
  onShare: () => void;
}) {
  const copy = async () => {
    await Clipboard.setStringAsync(code);
    onCopied();
  };
  return (
    <View style={styles.card} testID="referral-code-card">
      <Text style={styles.eyebrow}>Tu código</Text>
      <View style={styles.codeRow}>
        {/* Up to 20 characters: one line, the type shrinks to fit. */}
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.5}
          numberOfLines={1}
          selectable
          style={styles.code}
        >
          {code}
        </Text>
        <Pressable
          accessibilityLabel="Copiar código"
          accessibilityRole="button"
          onPress={() => void copy()}
          style={({ pressed }) => [styles.copy, pressed && styles.pressed]}
        >
          <Glyph color={colors.text} name="copy" size={18} strokeWidth={1.6} />
        </Pressable>
      </View>
      <PrimaryButton label="Compartir tu código" onPress={onShare} />
      {/* A row centres the link: the shared «Editar código» aligns itself left. */}
      <View style={styles.editRow}>
        <EditReferralCode fetcher={fetcher} onChanged={onChanged} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...surfaces.card, gap: spacing.md, padding: spacing.lgXl },
  code: {
    color: colors.text,
    flex: 1,
    fontFamily: fontFamilies.display,
    fontSize: 34,
    letterSpacing: 2,
    lineHeight: 40,
  },
  codeRow: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  copy: {
    alignItems: "center",
    borderColor: colors.borderStrong,
    borderRadius: radii.control,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  editRow: { flexDirection: "row", justifyContent: "center" },
  eyebrow: {
    color: colors.textMuted,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: typography.label,
    fontWeight: "500",
    letterSpacing: typography.label * 0.12,
    textTransform: "uppercase",
  },
  pressed: { opacity: 0.7 },
});
