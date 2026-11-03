import type { PropsWithChildren, ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { FormScrollView } from "../ui/form-scroll-view";
import { fontFamilies } from "../ui/fonts";
import { Heading } from "../ui/heading";
import { OutcomeBadge, type OutcomeBadgeProps } from "../ui/outcome-badge";
import { Screen } from "../ui/screen";
import { ScreenTopBar } from "../ui/screen-top-bar";
import { colors, radii, spacing } from "../ui/tokens";

/** The pill under the Staff wordmark (S01, S18): this is the team's entrance. */
export function TeamAccessBadge() {
  return (
    <View style={styles.teamBadge}>
      <Text style={styles.teamBadgeLabel}>Acceso del equipo</Text>
    </View>
  );
}

/** «Emma Pilates Studio» in Lora 36 (follow-up 227: the tagline is gone). */
export function BrandHeader({ teamAccess = false }: { teamAccess?: boolean }) {
  return (
    <View style={styles.brand}>
      <Text style={styles.wordmark}>Emma Pilates Studio</Text>
      {teamAccess ? <TeamAccessBadge /> : null}
    </View>
  );
}

/** A pre-session page: no tabs, the brand on top, and a centred panel. */
export function AuthenticationScreen({
  badge,
  brand = true,
  children,
  eyebrow,
  footer,
  teamAccess = false,
  title,
  topBar,
}: PropsWithChildren<{
  /** A confirmation's outcome: the badge over a centred title (MOB-035). */
  badge?: OutcomeBadgeProps;
  /** «Revisa tu correo» and its siblings draw no wordmark. */
  brand?: boolean;
  /** A small uppercase line over the title, such as «Activar cuenta». */
  eyebrow?: string;
  footer?: ReactNode;
  teamAccess?: boolean;
  title?: string;
  /** The full-width bar of 20, S18, and «Cambiar correo», with the way back. */
  topBar?: { onBack: () => void; title: string };
}>) {
  return (
    <Screen style={[styles.screen, topBar !== undefined && styles.screenWithBar]}>
      {topBar === undefined ? null : <ScreenTopBar onBack={topBar.onBack} title={topBar.title} />}
      <FormScrollView
        contentContainerStyle={styles.content}
        style={topBar === undefined ? undefined : styles.inset}
      >
        {brand ? <BrandHeader teamAccess={teamAccess} /> : null}
        <View style={styles.panel}>
          {eyebrow === undefined ? null : <Text style={styles.eyebrow}>{eyebrow}</Text>}
          {badge === undefined ? null : <OutcomeBadge {...badge} />}
          {title === undefined ? null : (
            <Heading style={badge === undefined ? undefined : authStyles.centered}>{title}</Heading>
          )}
          {children}
        </View>
        {footer}
      </FormScrollView>
    </Screen>
  );
}

export const authStyles = StyleSheet.create({
  centered: {
    textAlign: "center",
  },
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
  // A phone-width column, centred on a tablet instead of stretched.
  content: {
    alignSelf: "center",
    flexGrow: 1,
    gap: spacing.xxl,
    maxWidth: 480,
    width: "100%",
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
  inset: {
    paddingHorizontal: spacing.xlLg,
  },
  panel: {
    gap: spacing.lgXl,
  },
  screen: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xlLg,
  },
  // The bar spans the screen, so the column takes the side padding instead.
  screenWithBar: {
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  teamBadge: {
    backgroundColor: colors.secondaryTint,
    borderColor: colors.borderStrong,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.mdLg,
    paddingVertical: 5,
  },
  teamBadgeLabel: {
    color: colors.primaryOnTint,
    fontFamily: fontFamilies.body,
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: "uppercase",
  },
  wordmark: {
    color: colors.text,
    fontFamily: fontFamilies.display,
    fontSize: 36,
    lineHeight: 40,
    textAlign: "center",
  },
});
