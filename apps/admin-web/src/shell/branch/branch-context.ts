import { createContext } from "react";

export type Branch = {
  id: string;
  name: string;
  address: string;
};

export type BranchSelection = {
  branches: readonly Branch[];
  selectedBranch: Branch | undefined;
  selectBranch: (branchId: string) => void;
};

export const BranchContext = createContext<BranchSelection | null>(null);
