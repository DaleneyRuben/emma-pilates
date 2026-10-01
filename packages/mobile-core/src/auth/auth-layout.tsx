import type { PropsWithChildren, ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { BodyText } from "../ui/body-text";
import { fontFamilies } from "../ui/fonts";
import { Heading } from "../ui/heading";
import { Screen } from "../ui/screen";
import { colors, spacing, typography } from "../ui/tokens";

/** The Emma wordmark over its rule, with the tagline on the form screens. */
export function BrandHeader({ tagline = false }: { tagline?: boolean }) {
  return (
    <View style={styles.brand}>
      <Text style={styles.wordmark}>Emma</Text>
      <View style={styles.brandRule} />
      {tagline ? (
        <BodyText style={styles.tagline}>
          Movimiento · Equilibrio · Bienestar
        </BodyText>
      ) : null}
    </View>
  );
}

/** A pre-session page: no tabs, the brand on top, and a centred panel. */
export function AuthenticationScreen({
  brand = true,
  children,
  eyebrow,
  footer,
  tagline = false,
  title,
}: PropsWithChildren<{
  /** «Revisa tu correo» and its siblings draw no wordmark. */
  brand?: boolean;
  /** A small uppercase line over the title, such as «Activar cuenta». */
  eyebrow?: string;
  footer?: ReactNode;
  tagline?: boolean;
  title?: string;
}>) {
  return (
    <Screen style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {brand ? <BrandHeader tagline={tagline} /> : null}
          <View style={styles.panel}>
            {eyebrow === undefined ? null : (
              <Text style={styles.eyebrow}>{eyebrow}</Text>
            )}
            {title === undefined ? null : <Heading>{title}</Heading>}
            {children}
          </View>
          {footer}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

export const authStyles = StyleSheet.create({
  emphasized: {
    color: colors.text,
    fontWeight: "600",
  },
  muted: {
    color: colors.textMuted,
  },
});

const styles = StyleSheet.create({
  brand: {
    alignItems: "center",
    gap: spacing.md,
  },
  brandRule: {
    backgroundColor: colors.borderStrong,
    height: 1,
    width: 36,
  },
  content: {
    flexGrow: 1,
    gap: spacing.xxl,
    paddingBottom: spacing.xl,
    paddingTop: spacing.xxl,
  },
  eyebrow: {
    color: colors.primaryDeep,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 11,
    letterSpacing: 1.98,
    textTransform: "uppercase",
  },
  flex: {
    flex: 1,
  },
  panel: {
    gap: spacing.lgXl,
  },
  screen: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xlLg,
  },
  tagline: {
    color: colors.textMuted,
    fontSize: typography.label,
    letterSpacing: 2,
    textAlign: "center",
    textTransform: "uppercase",
  },
  wordmark: {
    color: colors.text,
    fontFamily: fontFamilies.display,
    fontSize: 44,
    lineHeight: 50,
  },
});
