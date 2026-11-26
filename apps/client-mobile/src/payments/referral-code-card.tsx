import {
  colors,
  EditReferralCode,
  Glyph,
  OutlinedButton,
  PrimaryButton,
  spacing,
  surfaces,
  Text,
} from "@pilates/mobile-core";
import * as Clipboard from "expo-clipboard";
import { Pressable, StyleSheet, View } from "react-native";

/**
 * Invita option A (FIX-082): one card with the code in `cifra-grande` and an
 * outlined copy icon, «Compartir tu código» right under it as the screen's
 * one solid action, and «Editar código» centred below. Rosa Emma C16 draws
 * this card as the 600 hero; it stays white until the shared «Editar código»
 * can be drawn in white on 600.
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
      <Text variant="etiqueta">Tu código</Text>
      <View style={styles.codeRow}>
        {/* Up to 20 characters: a long code wraps rather than shrinking (follow-up 285). */}
        <Text selectable style={styles.code} variant="cifra-grande">
          {code}
        </Text>
        <Pressable
          accessibilityLabel="Copiar código"
          accessibilityRole="button"
          onPress={() => void copy()}
          style={({ pressed }) => [styles.copy, pressed && styles.pressed]}
        >
          <Glyph color={colors.text} name="copy" size={20} strokeWidth={1.7} />
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

/**
 * C16h (walkthrough n.º 22): a code gives a friend a class only while its
 * owner has a paid Plan in force, so until then the card shows the code, says
 * when it starts working and offers the Plans instead of sharing.
 */
export function InactiveReferralCodeCard({
  code,
  onPurchase,
}: {
  code: string;
  onPurchase: () => void;
}) {
  return (
    <View style={styles.card} testID="referral-code-card">
      <Text variant="etiqueta">Tu código</Text>
      <Text selectable variant="cifra-grande">
        {code}
      </Text>
      <Text variant="cuerpo">Se activa cuando compres un plan.</Text>
      <OutlinedButton label="Comprar un plan" onPress={onPurchase} />
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
  editRow: { flexDirection: "row", justifyContent: "center" },
  pressed: { opacity: 0.7 },
});
