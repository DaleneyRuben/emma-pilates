import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { FooterPanel } from "./footer-panel";
import { Glyph, type GlyphName } from "./glyph";
import { InlineError } from "./inline-error";
import { ScreenHeader } from "./screen-header";
import { TabletColumn } from "./tablet-layout";
import { Text } from "./text";
import { colors, spacing, surfaces } from "./tokens";

/**
 * An outcome page (Rosa Emma C11, C11b, C11c and, since walkthrough n.º 8,
 * C01k): the band holds the line icon on a white disc and the
 * `titulo-pagina` title on the screen's one 16 pt edge; the line is a white
 * card; the buttons sit on the white footer panel. The caller's `Screen`
 * keeps `footerEdges`. `testID` prefixes the disc, the icon and the footer.
 */
export function StatusLayout({
  actions,
  children,
  error,
  icon,
  note,
  testID = "status",
  title,
}: {
  actions: ReactNode;
  /** More white cards under the line, such as the Plan's facts. */
  children?: ReactNode;
  error?: string | null;
  icon: GlyphName;
  note: string;
  testID?: string;
  title: string;
}) {
  return (
    <>
      <ScreenHeader>
        <View style={styles.disc} testID={`${testID}-disc`}>
          <Glyph
            color={colors.text}
            name={icon}
            size={28}
            strokeWidth={1.6}
            testID={`${testID}-icon-${icon}`}
          />
        </View>
        <Text accessibilityRole="header" variant="titulo-pagina">
          {title}
        </Text>
      </ScreenHeader>
      <ScrollView contentContainerStyle={styles.content} style={styles.scroll}>
        {/* 11T: the result in a centred 480 pt column. */}
        <TabletColumn gap={spacing.md} width={480}>
          <View style={styles.noteCard}>
            <Text variant="cuerpo">{note}</Text>
          </View>
          {children}
          {error === undefined || error === null ? null : (
            <View style={styles.errorBox}>
              <Glyph color={colors.errorText} name="alert" size={18} strokeWidth={1.7} />
              <InlineError style={styles.error}>{error}</InlineError>
            </View>
          )}
        </TabletColumn>
      </ScrollView>
      <FooterPanel testID={`${testID}-actions`}>
        <TabletColumn gap={spacing.sm} width={480}>
          {actions}
        </TabletColumn>
      </FooterPanel>
    </>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.lg },
  disc: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 32,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  error: { flex: 1 },
  errorBox: {
    alignItems: "flex-start",
    backgroundColor: colors.errorSurface,
    borderColor: colors.borderStrong,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.smLg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  noteCard: { ...surfaces.card, paddingHorizontal: spacing.lg, paddingVertical: spacing.mdLg },
  scroll: { flex: 1 },
});
