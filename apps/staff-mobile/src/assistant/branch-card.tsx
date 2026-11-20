import { Chip, spacing, surfaces } from "@pilates/mobile-core";
import { StyleSheet, View } from "react-native";

import { CardLabel } from "../profile/card-pieces";

type Branch = { id: string; name: string };

/**
 * The Branch chips on their own white card under an uppercase label (E-S04
 * «Sucursal», E-P03 «Sucursal donde recibes el efectivo»); shown only when
 * there is a choice to make, as `BranchChips` is.
 */
export function BranchCard({
  label,
  onSelect,
  options,
  selectedId,
  testIDPrefix,
}: {
  label: string;
  onSelect: (branchId: string) => void;
  options: Branch[];
  selectedId: string | null;
  testIDPrefix: string;
}) {
  if (options.length < 2) return null;
  return (
    <View style={styles.card}>
      <CardLabel>{label}</CardLabel>
      <View style={styles.chips}>
        {options.map((branch) => (
          <Chip
            key={branch.id}
            label={branch.name}
            onPress={() => onSelect(branch.id)}
            selected={branch.id === selectedId}
            testID={`${testIDPrefix}-${branch.id}`}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...surfaces.card, gap: spacing.smLg, padding: spacing.lg },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
