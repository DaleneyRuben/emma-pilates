import { useGetCurrentStaffMemberProfile, useListBranches } from "@pilates/api-contracts";
import { Chip, spacing, surfaces } from "@pilates/mobile-core";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { CardLabel } from "./card-pieces";

type Branch = { id: string; name: string };

// The Branches a person handles cash at: an Assistant's assignments, or every
// Branch for an Administrator, who has none. The first is chosen until she
// picks another. Exposes pending/error so cash-close can retry instead of
// spinning forever when the profile or Branch list fails (FIX-011).
export function useCashBranches() {
  const fetcher = useStaffFetcher();
  const profile = useGetCurrentStaffMemberProfile({ fetcher });
  const assigned = profile.data?.status === 200 ? profile.data.data.branches : [];
  const needsAllBranches = profile.data?.status === 200 && assigned.length === 0;
  const branches = useListBranches({
    fetcher,
    query: { enabled: needsAllBranches },
  });
  const options: Branch[] =
    assigned.length > 0 ? assigned : branches.data?.status === 200 ? branches.data.data : [];
  const [selectedId, select] = useState<string | null>(null);
  const branch = options.find((option) => option.id === selectedId) ?? options[0] ?? null;
  const isPending =
    profile.isPending || (needsAllBranches && branches.isPending && options.length === 0);
  // A failed refetch over data already loaded keeps the screen as it is: only
  // a request with no usable answer is an error.
  const failed = (query: { isError: boolean; data?: { status: number } }) =>
    query.data?.status !== 200 && (query.isError || query.data !== undefined);
  const isError = failed(profile) || (needsAllBranches && failed(branches));
  const refetch = () => {
    void profile.refetch();
    if (needsAllBranches || (profile.data?.status === 200 && assigned.length === 0)) {
      void branches.refetch();
    }
  };
  return { branch, options, select, isPending, isError, refetch };
}

/**
 * The Branch chips on their own white card under an uppercase label (E-S04
 * «Sucursal», E-P03 «Sucursal donde recibes el efectivo»); shown only when
 * there is a choice to make.
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
