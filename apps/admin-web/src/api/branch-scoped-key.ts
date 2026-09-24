/**
 * ADR-0042: a Branch-scoped read carries its Branch in the generated key's
 * params, so a change refreshes exactly that Branch's cached pages of one
 * operation and never another Branch's.
 */
export const isBranchScopedKey =
  (path: string, branchId: string) =>
  ({ queryKey }: { queryKey: readonly unknown[] }): boolean =>
    queryKey[0] === path &&
    (queryKey[1] as { branchId?: string } | undefined)?.branchId === branchId;
