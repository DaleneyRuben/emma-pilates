import { useMemo, useState, type ReactNode } from "react";
import {
  BranchContext,
  type Branch,
  type BranchSelection,
} from "./branch-context";

/**
 * The selected Branch is the one piece of low-frequency, application-wide
 * state ADR-0042 allows in a narrow React Context. It is local browser state:
 * queries that depend on it must put `selectedBranch.id` in their key.
 */
export function BranchProvider({
  branches,
  status,
  initialBranchId,
  children,
}: {
  branches: readonly Branch[];
  status: BranchSelection["status"];
  initialBranchId?: string;
  children: ReactNode;
}) {
  const [selectedBranchId, setSelectedBranchId] = useState<string | undefined>(
    () => initialBranchId ?? branches[0]?.id,
  );

  const value = useMemo<BranchSelection>(
    () => ({
      branches,
      status,
      selectedBranch:
        branches.find((branch) => branch.id === selectedBranchId) ??
        branches[0],
      selectBranch: (branchId) => {
        if (branches.some((branch) => branch.id === branchId)) {
          setSelectedBranchId(branchId);
        }
      },
    }),
    [branches, status, selectedBranchId],
  );

  return (
    <BranchContext.Provider value={value}>{children}</BranchContext.Provider>
  );
}
