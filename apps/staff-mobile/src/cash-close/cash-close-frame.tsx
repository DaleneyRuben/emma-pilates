import { colors, FormScrollView, shadows, spacing } from "@pilates/mobile-core";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { bodyScroll, FooterPanel } from "../profile/card-pieces";

/**
 * Cerrar caja's body under its fixed band (E-S04 to E-S08): the cards scroll
 * and the buttons wait in the white footer panel. On the Assistant's Caja tab
 * the tab bar already keeps the bottom safe area, so the panel only pads itself.
 */
export function CashCloseFrame({
  children,
  footer,
  root,
}: {
  children: ReactNode;
  footer?: ReactNode;
  root: boolean;
}) {
  const panel =
    footer === undefined ? undefined : root ? (
      <View style={styles.tabFooter}>{footer}</View>
    ) : (
      <FooterPanel bleed={0}>{footer}</FooterPanel>
    );
  return (
    <View style={bodyScroll.clip}>
      <FormScrollView contentContainerStyle={bodyScroll.content} footer={panel}>
        {children}
      </FormScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabFooter: {
    ...shadows.footer,
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: spacing.smLg,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.mdLg,
  },
});
