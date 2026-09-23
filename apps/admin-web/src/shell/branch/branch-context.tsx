import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Branch = {
  id: string;
  name: string;
  address: string;
};

type BranchSelection = {
  branches: readonly Branch[];
  selectedBranch: Branch | undefined;
  selectBranch: (branchId: string) => void;
};

const BranchContext = createContext<BranchSelection | null>(null);

/**
 * The selected Branch is the one piece of low-frequency, application-wide
 * state ADR-0042 allows in a narrow React Context. It is local browser state:
 * queries that depend on it must put `selectedBranch.id` in their key.
 */
export function BranchProvider({
  branches,
  initialBranchId,
  children,
}: {
  branches: readonly Branch[];
  initialBranchId?: string;
  children: ReactNode;
}) {
  const [selectedBranchId, setSelectedBranchId] = useState<string | undefined>(
    () => initialBranchId ?? branches[0]?.id,
  );

  const value = useMemo<BranchSelection>(
    () => ({
      branches,
      selectedBranch:
        branches.find((branch) => branch.id === selectedBranchId) ??
        branches[0],
      selectBranch: (branchId) => {
        if (branches.some((branch) => branch.id === branchId)) {
          setSelectedBranchId(branchId);
        }
      },
    }),
    [branches, selectedBranchId],
  );

  return (
    <BranchContext.Provider value={value}>{children}</BranchContext.Provider>
  );
}

export function useBranchSelection(): BranchSelection {
  const selection = useContext(BranchContext);
  if (selection === null) {
    throw new Error("useBranchSelection needs a BranchProvider above it");
  }
  return selection;
}
