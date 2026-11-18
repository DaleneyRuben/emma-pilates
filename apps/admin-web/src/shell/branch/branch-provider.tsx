import { useMemo, useState, type ReactNode } from "react";
import {
  BranchContext,
  type Branch,
  type BranchSelection,
} from "./branch-context";
import { readRememberedBranchId, rememberBranchId } from "./branch-memory";

/**
 * The selected Branch is the one piece of low-frequency, application-wide
 * state ADR-0042 allows in a narrow React Context. It is local browser state:
 * queries that depend on it must put `selectedBranch.id` in their key.
 * The choice is remembered per account in this browser (finding 121); one
 * that is no longer among the active Branches falls back to the first.
 * The account is read after the first draw when no guard has read it yet,
 * so a newly known account picks up its own remembered Branch then.
 */
export function BranchProvider({
  branches,
  status,
  accountId,
  children,
}: {
  branches: readonly Branch[];
  status: BranchSelection["status"];
  accountId?: string;
  children: ReactNode;
}) {
  const [choice, setChoice] = useState(() => ({
    accountId,
    branchId: readRememberedBranchId(accountId),
  }));
  if (choice.accountId !== accountId) {
    setChoice({ accountId, branchId: readRememberedBranchId(accountId) });
  }
  const selectedBranchId = choice.branchId;

  const value = useMemo<BranchSelection>(
    () => ({
      branches,
      status,
      selectedBranch:
        branches.find((branch) => branch.id === selectedBranchId) ??
        branches[0],
      selectBranch: (branchId) => {
        if (branches.some((branch) => branch.id === branchId)) {
          setChoice({ accountId, branchId });
          rememberBranchId(accountId, branchId);
        }
      },
    }),
    [accountId, branches, status, selectedBranchId],
  );

  return (
    <BranchContext.Provider value={value}>{children}</BranchContext.Provider>
  );
}
