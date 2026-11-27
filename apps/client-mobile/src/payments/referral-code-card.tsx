import {
  OnEmphasisButton,
  ShareableReferralCodeCard,
  spacing,
  surfaces,
  Text,
} from "@pilates/mobile-core";
import type { ComponentProps } from "react";
import { StyleSheet, View } from "react-native";

/** C16, C16s, C16g: the shared card as the deep-rose hero, like the Staff one (E-F13). */
export function ReferralCodeCard(
  props: Omit<ComponentProps<typeof ShareableReferralCodeCard>, "emphasis">,
) {
  return <ShareableReferralCodeCard {...props} emphasis />;
}

/**
 * C16h (walkthrough n.º 22): a code gives a friend a class only while its
 * owner has a paid Plan in force, so until then the deep-rose card shows the
 * code, says when it starts working and offers the Plans instead of sharing.
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
      <Text tone="onDark" variant="etiqueta">
        Tu código
      </Text>
      <Text selectable tone="onDark" variant="cifra-grande">
        {code}
      </Text>
      <Text tone="onDark" variant="cuerpo">
        Se activa cuando compres un plan.
      </Text>
      <OnEmphasisButton label="Comprar un plan" onPress={onPurchase} wide />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...surfaces.emphasis, gap: spacing.smLg, padding: spacing.xlSm },
});
