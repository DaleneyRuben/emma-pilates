import { colors, fontFamilies, spacing, typography } from "@pilates/mobile-core";
import { useState, type ReactElement } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { RowCard } from "../profile/card-pieces";

/**
 * A day's classes under the hero (equipo boards I01–I03, H01–H04): the
 * standing classes in one white card headed by the day's label («Hoy · 3
 * clases · 1 cancelada»), then the cancelled ones folded into their own card,
 * «1 cancelada por mínimo · Ver». Opened, the cancelled rows come in a card
 * of their own above the fold. The label heads whichever card comes first, so
 * a day of only cancelled classes still says so while folded.
 */
export function ClassDayCards({
  cancelledListTestID,
  cancelledRows,
  foldTestID = "cancelled-fold",
  label,
  listTestID = "class-list",
  reason = "por mínimo",
  rows,
}: {
  cancelledListTestID: string;
  cancelledRows: readonly ReactElement[];
  foldTestID?: string;
  label: string;
  listTestID?: string;
  reason?: string;
  rows: readonly ReactElement[];
}) {
  const [open, setOpen] = useState(false);
  const count = cancelledRows.length;
  const showCancelled = open && count > 0;
  const labelOn = rows.length > 0 || count === 0 ? "list" : showCancelled ? "cancelled" : "fold";
  const summary = [count, count === 1 ? "cancelada" : "canceladas", reason]
    .filter((part) => part !== "")
    .join(" ");

  return (
    <>
      {labelOn === "list" ? (
        <RowCard label={label} testID={listTestID}>
          {rows}
        </RowCard>
      ) : null}
      {showCancelled ? (
        <RowCard label={labelOn === "cancelled" ? label : undefined} testID={cancelledListTestID}>
          {cancelledRows}
        </RowCard>
      ) : null}
      {count === 0 ? null : (
        <RowCard label={labelOn === "fold" ? label : undefined} testID={foldTestID}>
          <Pressable
            accessibilityLabel={`${summary}, ${open ? "Ocultar" : "Ver"}`}
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            onPress={() => setOpen((current) => !current)}
            style={({ pressed }) => [styles.fold, pressed && styles.pressed]}
          >
            <Text style={styles.summary}>{summary}</Text>
            <Text style={styles.toggle}>{open ? "Ocultar" : "Ver"}</Text>
          </Pressable>
        </RowCard>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  fold: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 64,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  pressed: { opacity: 0.7 },
  summary: {
    color: colors.text,
    flex: 1,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.body,
    fontWeight: "600",
  },
  toggle: {
    color: colors.text,
    fontFamily: fontFamilies.bodyBold,
    fontSize: 14,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});
