import { Fragment } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Text } from "../ui/text";
import { spacing } from "../ui/tokens";
import { textVariants } from "../ui/type-scale";

export type ProfileFooterLink = { label: string; onPress: () => void; testID: string };

/** Each 12 pt link reaches the 44 pt touch area above and below its line. */
const linkSlop = (44 - textVariants["enlace-pie"].lineHeight) / 2;

/**
 * The end of Perfil in both apps (C18s, E-F24; follow-up 293): two fixed
 * lines straight on Fondo with no card, the studio and its version, then the
 * links split by a dot, in `texto-pie` at 12 regular, 16 pt under the
 * «Cerrar sesión» card.
 */
export function ProfileFooter({
  links,
  screenGap = spacing.md,
  version,
}: {
  links: readonly ProfileFooterLink[];
  /** The gap the screen already leaves between its cards; the footer adds the rest of the 16 pt. */
  screenGap?: number;
  version: string;
}) {
  return (
    <View style={[styles.footer, { marginTop: spacing.lg - screenGap }]} testID="profile-footer">
      <Text style={styles.centered} tone="texto-pie" variant="pie">
        {`Emma Pilates Studio · versión ${version}`}
      </Text>
      <View style={styles.links} testID="profile-footer-links">
        {links.map((link, index) => (
          <Fragment key={link.testID}>
            {index === 0 ? null : (
              <Text tone="texto-pie" variant="pie">
                {" · "}
              </Text>
            )}
            <Pressable
              accessibilityRole="link"
              hitSlop={{ bottom: linkSlop, top: linkSlop }}
              onPress={link.onPress}
              testID={link.testID}
            >
              <Text tone="texto-pie" variant="enlace-pie">
                {link.label}
              </Text>
            </Pressable>
          </Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { textAlign: "center" },
  footer: { alignItems: "center", gap: spacing.xxs, paddingVertical: spacing.xs },
  links: { alignItems: "center", flexDirection: "row", justifyContent: "center" },
});
