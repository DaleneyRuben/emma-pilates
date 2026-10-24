import { useGetCurrentStaffMemberProfile, useListBranches } from "@pilates/api-contracts";
import { BodyText, colors, radii, spacing, typography } from "@pilates/mobile-core";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";

type Branch = { id: string; name: string };

// The Branches a person handles cash at: an Assistant's assignments, or every
// Branch for an Administrator, who has none. The first is chosen until she
// picks another.
export function useCashBranches() {
  const fetcher = useStaffFetcher();
  const profile = useGetCurrentStaffMemberProfile({ fetcher });
  const assigned = profile.data?.status === 200 ? profile.data.data.branches : [];
  const branches = useListBranches({
    fetcher,
    query: { enabled: profile.data?.status === 200 && assigned.length === 0 },
  });
  const options: Branch[] =
    assigned.length > 0 ? assigned : branches.data?.status === 200 ? branches.data.data : [];
  const [selectedId, select] = useState<string | null>(null);
  const branch = options.find((option) => option.id === selectedId) ?? options[0] ?? null;
  return { branch, options, select };
}

// S10's Branch chips; shown only when there is a choice to make.
export function BranchChips({
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
    <View style={styles.branches}>
      <BodyText style={styles.label}>{label}</BodyText>
      <View style={styles.chips}>
        {options.map((branch) => {
          const selected = branch.id === selectedId;
          return (
            <Pressable
              accessibilityLabel={branch.name}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={branch.id}
              onPress={() => onSelect(branch.id)}
              style={[styles.chip, selected && styles.chipSelected]}
              testID={`${testIDPrefix}-${branch.id}`}
            >
              <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
                {branch.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  branches: { gap: spacing.sm },
  chip: {
    borderColor: colors.borderStrong,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipLabel: { color: colors.textSecondary, fontSize: typography.note },
  chipLabelSelected: { color: colors.white },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  label: { color: colors.textMuted, fontSize: typography.note },
});
