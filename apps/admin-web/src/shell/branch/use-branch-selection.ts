import { useContext } from "react";
import { BranchContext, type BranchSelection } from "./branch-context";

export function useBranchSelection(): BranchSelection {
  const selection = useContext(BranchContext);
  if (selection === null) {
    throw new Error("useBranchSelection needs a BranchProvider above it");
  }
  return selection;
}
