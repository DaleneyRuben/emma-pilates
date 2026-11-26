import { OutlinedButton, spacing, surfaces, Text } from "@pilates/mobile-core";
import { StyleSheet, View } from "react-native";

/** Invita option A (FIX-082) and C16: the shared card, white in the Client app. */
export { ShareableReferralCodeCard as ReferralCodeCard } from "@pilates/mobile-core";

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
});
