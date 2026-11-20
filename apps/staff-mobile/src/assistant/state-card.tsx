import {
  colors,
  Glyph,
  type GlyphName,
  PrimaryButton,
  spacing,
  surfaces,
  Text,
} from "@pilates/mobile-core";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

/**
 * A white card with a line icon, a title and one line (E-C10 «Sin plan
 * activo», E-C12 «Cuenta pendiente de activación»), with an optional action.
 * As the boards draw them (follow-up 285): a row-like card has a `titulo-fila`
 * title over a `secundario` line; `display` («Sin plan activo», the card that
 * stands in for the plan) has a `titulo-bloque` title over a `cuerpo` note.
 */
export function StateCard({
  action,
  children,
  display = false,
  icon,
  note,
  testID,
  title,
  trailing,
}: {
  action?: { label: string; onPress: () => void; testID?: string };
  children?: ReactNode;
  display?: boolean;
  icon: GlyphName;
  note?: string;
  testID?: string;
  title: string;
  trailing?: ReactNode;
}) {
  return (
    <View style={[styles.card, display && styles.displayCard]} testID={testID}>
      <View style={styles.row}>
        <View style={[styles.disc, display && styles.displayDisc]}>
          <Glyph color={colors.text} name={icon} size={22} strokeWidth={1.6} />
        </View>
        <View style={styles.body}>
          <Text variant={display ? "titulo-bloque" : "titulo-fila"}>{title}</Text>
          {note === undefined ? null : (
            <Text variant={display ? "cuerpo" : "secundario"}>{note}</Text>
          )}
        </View>
        {trailing}
      </View>
      {children}
      {action === undefined ? null : <PrimaryButton {...action} />}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, gap: spacing.xs },
  card: { ...surfaces.card, gap: spacing.md, padding: spacing.lg },
  // FIX-089: the icon stands alone, with no tinted disc behind it.
  disc: { alignItems: "center", paddingTop: 1, width: 24 },
  displayCard: { gap: spacing.mdLg, padding: spacing.lgXl },
  displayDisc: { paddingTop: spacing.xs },
  row: { alignItems: "flex-start", flexDirection: "row", gap: spacing.md },
});
