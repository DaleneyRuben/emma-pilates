import { Chevron, colors, Glyph, spacing, Text } from "@pilates/mobile-core";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { FilterChips } from "./filter-chips";

type Branch = { id: string; name: string };

/**
 * «Sucursal Achumani» under a screen title (S07, S13, Horario). With one
 * Branch it is fixed: no chevron, nothing to tap (walkthrough 7). From the
 * second Branch it opens the Branch chips, plus «Todas» when `allLabel` is set.
 * Boards E-D12, E-H02, E-R01: «Sucursal» in `cuerpo` with the name in
 * `titulo-fila`. It is small text, so it always sits inside a white card.
 */
export function BranchField({
  allLabel,
  onSelect,
  options,
  selectedId,
  selectedName,
}: {
  allLabel?: string;
  onSelect: (branchId: string) => void;
  options: readonly Branch[];
  selectedId: string;
  selectedName: string;
}) {
  const [open, setOpen] = useState(false);
  const line = (
    <>
      <Glyph color={colors.primary} name="pin" size={16} strokeWidth={1.5} />
      <Text style={styles.label} variant="cuerpo">
        Sucursal <Text variant="titulo-fila">{selectedName}</Text>
      </Text>
    </>
  );
  if (options.length < 2) {
    return (
      <View style={styles.line} testID="branch-field-fixed">
        {line}
      </View>
    );
  }
  const choices = [...(allLabel === undefined ? [] : [{ id: "all", label: allLabel }])].concat(
    options.map((branch) => ({ id: branch.id, label: branch.name })),
  );
  return (
    <View style={styles.field}>
      <Pressable
        accessibilityLabel={`Sucursal: ${selectedName}`}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((current) => !current)}
        style={styles.line}
        testID="branch-field"
      >
        {line}
        <Chevron size={14} strokeWidth={1.5} tone="muted" />
      </Pressable>
      {open ? (
        <FilterChips
          onSelect={(id) => {
            onSelect(id);
            setOpen(false);
          }}
          options={choices}
          selected={selectedId}
          testID="branch-field-options"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  label: { flexShrink: 1 },
  line: { alignItems: "center", alignSelf: "flex-start", flexDirection: "row", gap: spacing.sm },
});
