import * as Clipboard from "expo-clipboard";
import { Pressable, StyleSheet, View } from "react-native";

import { Glyph } from "../ui/glyph";
import { OnEmphasisButton } from "../ui/emphasis-card";
import { PrimaryButton } from "../ui/primary-button";
import { Text } from "../ui/text";
import { colors, spacing, surfaces } from "../ui/tokens";
import { EditReferralCode } from "./own-referral-code";

/**
 * «Invita a una amiga» (C16) and the Staff «Tu código de referido» (E-F13):
 * one card with the code and an outlined copy icon, «Compartir tu código» as
 * its one solid action, and «Editar código» centred below. The Staff app
 * draws it as the 600 hero (`emphasis`). A long code shrinks to fit one line
 * and never breaks mid-word (walkthrough n.º 27, E-F21).
 */
export function ShareableReferralCodeCard({
  code,
  emphasis = false,
  fetcher,
  onChanged,
  onCopied,
  onShare,
}: {
  code: string;
  emphasis?: boolean;
  fetcher: typeof fetch;
  onChanged: () => void;
  onCopied: () => void;
  onShare: () => void;
}) {
  const tone = emphasis ? "onDark" : "ink";
  const copy = async () => {
    await Clipboard.setStringAsync(code);
    onCopied();
  };
  return (
    <View style={[styles.card, emphasis && styles.emphasis]} testID="referral-code-card">
      <Text tone={tone} variant="etiqueta">
        Tu código
      </Text>
      <View style={styles.codeRow}>
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.5}
          numberOfLines={1}
          selectable
          style={styles.code}
          tone={tone}
          variant="cifra-grande"
        >
          {code}
        </Text>
        <Pressable
          accessibilityLabel="Copiar código"
          accessibilityRole="button"
          onPress={() => void copy()}
          style={({ pressed }) => [
            styles.copy,
            emphasis && styles.copyOnDark,
            pressed && styles.pressed,
          ]}
        >
          <Glyph
            color={emphasis ? colors.onEmphasis : colors.text}
            name="copy"
            size={20}
            strokeWidth={1.7}
          />
        </Pressable>
      </View>
      {emphasis ? (
        <OnEmphasisButton label="Compartir tu código" onPress={onShare} wide />
      ) : (
        <PrimaryButton label="Compartir tu código" onPress={onShare} />
      )}
      {/* A row centres the link: the shared «Editar código» aligns itself left. */}
      <View style={styles.editRow}>
        <EditReferralCode fetcher={fetcher} onChanged={onChanged} onDark={emphasis} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...surfaces.card, gap: spacing.md, padding: spacing.xlSm },
  code: { flex: 1 },
  codeRow: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  copy: {
    alignItems: "center",
    borderColor: colors.borderStrong,
    borderRadius: 12,
    borderWidth: 1.5,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  copyOnDark: { borderColor: colors.onEmphasis },
  editRow: { flexDirection: "row", justifyContent: "center" },
  emphasis: { ...surfaces.emphasis },
  pressed: { opacity: 0.7 },
});
