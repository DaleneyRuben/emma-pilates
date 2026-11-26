import { useContext, type PropsWithChildren, type ReactNode } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";
import { Polyline } from "react-native-svg";

import logo from "../../assets/emma-logo.png";
import { FormScrollView } from "../ui/form-scroll-view";
import { LineIcon } from "../ui/line-icon";
import type { OutcomeBadgeProps } from "../ui/outcome-badge";
import { Screen } from "../ui/screen";
import { tabletPageMargin } from "../ui/tablet-layout";
import { Text } from "../ui/text";
import { colors, radii, shadows, spacing } from "../ui/tokens";
import { OutcomeDisc } from "./outcome-disc";

const logoAspect = 565 / 1312;
/** `20T`/`21T`: the logo is 300 pt over the sheet (01T's sign-in keeps 380). */
const logoWidth = 300;

/**
 * A Client pre-session page on a tablet (`20T`, `21T`, Login A of follow-up
 * 288): the logo on the 200 screen and a 560 pt white sheet anchored to the
 * bottom, holding the page's title, text, fields and actions in that order.
 */
export function TabletAuthScreen({
  actions,
  badge,
  children,
  eyebrow,
  footer,
  revealEndWithKeyboard = false,
  title,
  topBar,
}: PropsWithChildren<{
  actions?: ReactNode;
  badge?: OutcomeBadgeProps;
  eyebrow?: string;
  footer?: ReactNode;
  /** Scroll to the end above the keyboard while the last field has it (C01b3, #6). */
  revealEndWithKeyboard?: boolean;
  title?: string;
  topBar?: { onBack: () => void; title: string };
}>) {
  const bottom = useContext(SafeAreaInsetsContext)?.bottom ?? 0;
  const heading = topBar?.title ?? title;
  return (
    <Screen edges={sheetEdges} style={styles.screen}>
      <FormScrollView
        contentContainerStyle={styles.content}
        revealEndWithKeyboard={revealEndWithKeyboard}
      >
        <View style={styles.hero} testID="tablet-auth-hero">
          {topBar === undefined ? null : (
            <Pressable
              accessibilityLabel="Volver"
              accessibilityRole="button"
              hitSlop={spacing.xs}
              onPress={topBar.onBack}
              style={({ pressed }) => [styles.back, pressed && styles.pressed]}
              testID="back-bar"
            >
              <LineIcon color={colors.text} size={22} strokeWidth={1.7}>
                <Polyline points="15,5 8,12 15,19" />
              </LineIcon>
            </Pressable>
          )}
          <Image
            accessibilityLabel="Emma Pilates Studio"
            accessibilityRole="image"
            accessible
            resizeMode="contain"
            source={logo}
            style={{ height: Math.round(logoWidth * logoAspect), width: logoWidth }}
          />
        </View>
        <View
          style={[styles.sheet, { paddingBottom: spacing.xxxl + bottom }]}
          testID="authentication-panel"
        >
          {badge === undefined ? null : <OutcomeDisc {...badge} surface="card" />}
          {eyebrow === undefined ? null : (
            <View style={styles.eyebrow}>
              <Text variant="etiqueta">{eyebrow}</Text>
            </View>
          )}
          {heading === undefined ? null : (
            <Text accessibilityRole="header" variant="titulo-pagina">
              {heading}
            </Text>
          )}
          {topBar !== undefined && title !== undefined && title !== heading ? (
            <Text variant="titulo-seccion">{title}</Text>
          ) : null}
          {children}
          {actions === undefined ? null : <View style={styles.actions}>{actions}</View>}
          {footer === undefined ? null : <View style={styles.actions}>{footer}</View>}
        </View>
      </FormScrollView>
    </Screen>
  );
}

/** The sheet owns the bottom edge, so the Screen keeps only the others. */
const sheetEdges = ["top", "left", "right"] as const;

const styles = StyleSheet.create({
  actions: { gap: spacing.md },
  back: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    left: tabletPageMargin,
    position: "absolute",
    top: spacing.lg,
    width: 44,
  },
  content: { flexGrow: 1 },
  eyebrow: {
    alignSelf: "flex-start",
    backgroundColor: colors.primaryTint,
    borderRadius: radii.pill,
    justifyContent: "center",
    minHeight: 26,
    paddingHorizontal: spacing.md,
  },
  hero: {
    alignItems: "center",
    flexGrow: 1,
    justifyContent: "center",
    paddingBottom: spacing.xxl,
    paddingHorizontal: tabletPageMargin,
    paddingTop: 64,
  },
  pressed: { opacity: 0.6 },
  screen: { backgroundColor: colors.band, padding: 0 },
  sheet: {
    ...shadows.sheet,
    alignSelf: "center",
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.band,
    borderTopRightRadius: radii.band,
    gap: spacing.mdLg,
    maxWidth: 560,
    paddingHorizontal: tabletPageMargin,
    paddingTop: spacing.xxl,
    width: "100%",
  },
});
