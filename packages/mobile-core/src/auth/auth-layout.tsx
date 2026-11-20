import type { PropsWithChildren, ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { FooterPanel, footerEdges, footerScreen } from "../ui/footer-panel";
import { FormScrollView } from "../ui/form-scroll-view";
import { fontFamilies } from "../ui/fonts";
import type { OutcomeBadgeProps } from "../ui/outcome-badge";
import { Screen } from "../ui/screen";
import { ScreenHeader } from "../ui/screen-header";
import { colors, radii, spacing, surfaces, typography } from "../ui/tokens";
import { OutcomeDisc } from "./outcome-disc";

/** The white capsule under the Staff wordmark (E-A01, E-A04): the team's entrance. */
export function TeamAccessBadge({ start = false }: { start?: boolean }) {
  return (
    <View style={[styles.teamBadge, start && styles.teamBadgeStart]}>
      <Text style={styles.teamBadgeLabel}>Acceso del equipo</Text>
    </View>
  );
}

/** «Emma Pilates Studio» in Lora on the band (follow-up 227: the tagline is gone). */
export function BrandHeader({ teamAccess = false }: { teamAccess?: boolean }) {
  return (
    <View style={styles.brand}>
      <Text style={[styles.wordmark, teamAccess && styles.wordmarkTeam]}>Emma Pilates Studio</Text>
      {teamAccess ? <TeamAccessBadge /> : null}
    </View>
  );
}

/**
 * A pre-session page (Rosa Emma): the 200 band with the wordmark, the way back
 * or the outcome, then the page's white card. `actions` sit under the card on
 * the client boards and inside it on the staff ones; `footer` is a fixed white
 * panel at the bottom.
 */
export function AuthenticationScreen({
  actions,
  badge,
  brand = true,
  children,
  eyebrow,
  footer,
  staff = false,
  teamAccess = false,
  title,
  topBar,
}: PropsWithChildren<{
  /** The buttons and links after the card's text. */
  actions?: ReactNode;
  /** A confirmation's outcome: the disc over a centred title (MOB-035). */
  badge?: OutcomeBadgeProps;
  /** «Revisa tu correo» and its siblings draw no wordmark. */
  brand?: boolean;
  /** A small uppercase line over the title, such as «Activar cuenta». */
  eyebrow?: string;
  /** A fixed white panel at the bottom, such as «Crear cuenta». */
  footer?: ReactNode;
  /** The team boards (E-A05–A10) draw the outcome and its actions in the card. */
  staff?: boolean;
  teamAccess?: boolean;
  title?: string;
  /** The band's way back and title (20, S18, «Cambiar correo»). */
  topBar?: { onBack: () => void; title: string };
}>) {
  const outcomeOnBand = badge !== undefined && !staff && topBar === undefined;
  const outcomeInCard = badge !== undefined && staff;
  const outcomeOnScreen = badge !== undefined && !staff && topBar !== undefined;
  const outcomeTitle = (
    <Text
      style={[styles.outcomeTitle, outcomeInCard && styles.outcomeTitleCard, authStyles.centered]}
    >
      {title}
    </Text>
  );

  return (
    <Screen
      edges={footer === undefined ? undefined : footerEdges}
      style={[styles.screen, footer !== undefined && footerScreen]}
    >
      <FormScrollView
        band
        contentContainerStyle={styles.content}
        footer={footer === undefined ? undefined : <FooterPanel>{footer}</FooterPanel>}
      >
        {topBar === undefined ? (
          <ScreenHeader>
            <View style={styles.bandBody}>
              {brand ? <BrandHeader teamAccess={teamAccess} /> : null}
              {!brand && teamAccess ? <TeamAccessBadge /> : null}
              {outcomeOnBand ? (
                <View style={styles.outcome}>
                  <OutcomeDisc {...badge} surface="band" />
                  {outcomeTitle}
                </View>
              ) : null}
            </View>
          </ScreenHeader>
        ) : (
          <ScreenHeader onBack={topBar.onBack} title={topBar.title}>
            {teamAccess ? <TeamAccessBadge start /> : null}
          </ScreenHeader>
        )}
        {outcomeOnScreen ? (
          <View style={styles.outcome}>
            <OutcomeDisc {...badge} surface="band" />
            {outcomeTitle}
          </View>
        ) : null}
        <View
          style={[styles.panel, outcomeInCard && styles.panelOutcome]}
          testID="authentication-panel"
        >
          {outcomeInCard ? <OutcomeDisc {...badge} surface="card" /> : null}
          {outcomeInCard ? outcomeTitle : null}
          {eyebrow === undefined ? null : <Text style={styles.eyebrow}>{eyebrow}</Text>}
          {badge === undefined && title !== undefined ? (
            <Text style={[styles.title, staff && styles.titleStaff]}>{title}</Text>
          ) : null}
          {children}
          {staff && actions !== undefined ? (
            <View style={styles.cardActions}>{actions}</View>
          ) : null}
        </View>
        {!staff && actions !== undefined ? <View style={styles.actions}>{actions}</View> : null}
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
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.bodyLarge,
    fontWeight: "600",
  },
  muted: {
    color: colors.textMuted,
  },
  /** A text button on the 100 screen rides on a white pill (C01c, C20b, C21e). */
  pill: {
    alignSelf: "center",
    backgroundColor: colors.card,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xlSm,
  },
  /** A short note in a card, such as the link's lifetime. */
  small: {
    fontSize: typography.note,
    lineHeight: 19,
  },
});

const styles = StyleSheet.create({
  actions: { gap: spacing.md },
  bandBody: { gap: spacing.md, paddingBottom: spacing.xs, paddingTop: spacing.xl },
  brand: {
    alignItems: "center",
    gap: spacing.md,
  },
  cardActions: { alignSelf: "stretch", gap: spacing.md },
  // A phone-width column, centred on a tablet instead of stretched.
  content: {
    alignSelf: "center",
    flexGrow: 1,
    gap: spacing.md,
    maxWidth: 480,
    paddingBottom: spacing.xxl,
    width: "100%",
  },
  eyebrow: {
    color: colors.text,
    fontFamily: fontFamilies.bodyBold,
    fontSize: typography.label,
    fontWeight: "700",
    letterSpacing: typography.label * 0.14,
    textTransform: "uppercase",
  },
  outcome: { alignItems: "center", gap: spacing.mdLg },
  outcomeTitle: {
    color: colors.text,
    fontFamily: fontFamilies.display,
    fontSize: typography.title,
    lineHeight: 36,
  },
  outcomeTitleCard: { fontSize: typography.hero, lineHeight: 34 },
  panel: {
    ...surfaces.card,
    gap: spacing.mdLg,
    marginTop: spacing.xs,
    padding: spacing.xlSm,
  },
  panelOutcome: {
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.xlSm,
    paddingVertical: spacing.xxl - spacing.xs,
  },
  screen: {
    backgroundColor: colors.surface,
  },
  teamBadge: {
    alignSelf: "center",
    backgroundColor: colors.card,
    borderRadius: radii.pill,
    justifyContent: "center",
    minHeight: 26,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
  },
  teamBadgeStart: { alignSelf: "flex-start" },
  teamBadgeLabel: {
    color: colors.text,
    fontFamily: fontFamilies.bodyBold,
    fontSize: typography.label,
    fontWeight: "700",
    letterSpacing: typography.label * 0.12,
    textTransform: "uppercase",
  },
  title: {
    color: colors.text,
    fontFamily: fontFamilies.display,
    fontSize: 26,
    lineHeight: 32,
  },
  titleStaff: { fontSize: typography.hero, lineHeight: 34 },
  wordmark: {
    color: colors.text,
    fontFamily: fontFamilies.display,
    fontSize: 34,
    lineHeight: 38,
    textAlign: "center",
  },
  wordmarkTeam: { fontSize: 36, lineHeight: 40 },
});
