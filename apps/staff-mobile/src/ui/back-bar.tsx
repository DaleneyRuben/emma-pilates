import { ScreenHeader, spacing } from "@pilates/mobile-core";
import type { ReactNode } from "react";
import { StyleSheet } from "react-native";

/**
 * A pushed screen's top: the shared EncabezadoA (FIX-089), the back arrow on
 * its own row and the screen's own large title under it. `back` (the screen it
 * returns to) is no longer drawn: a header never names the parent screen.
 */
export function BackBar({
  onBack,
  subtitle,
  title,
  trailing,
}: {
  back?: string;
  onBack: () => void;
  subtitle?: string;
  title?: string;
  trailing?: ReactNode;
}) {
  return (
    <ScreenHeader
      action={trailing}
      onBack={onBack}
      subtitle={subtitle}
      testID="back-bar-block"
      title={title}
    />
  );
}

/**
 * For a BackBar inside a ScrollView on a screen padded by `xlSm`: the scroller
 * reaches the screen edge and pads its content instead (iPad walk).
 */
export const backBarScroll = StyleSheet.create({
  content: { paddingHorizontal: spacing.xlSm },
  scroll: { marginHorizontal: -spacing.xlSm },
});
