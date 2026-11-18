// Walkthrough finding 121: the chosen Branch outlives a reload or a typed
// URL. It is a per-browser convenience kept per account, so a shared
// computer does not hand one person's Branch to the next. A browser that
// refuses storage (private mode, blocked site data) simply forgets it.
const keyOf = (accountId: string) => `emma.admin.branch.${accountId}`;

export function readRememberedBranchId(
  accountId: string | undefined,
): string | undefined {
  if (accountId === undefined) return undefined;
  try {
    return window.localStorage.getItem(keyOf(accountId)) ?? undefined;
  } catch {
    return undefined;
  }
}

export function rememberBranchId(
  accountId: string | undefined,
  branchId: string,
): void {
  if (accountId === undefined) return;
  try {
    window.localStorage.setItem(keyOf(accountId), branchId);
  } catch {
    // Nothing to do: the choice still holds until the page is reloaded.
  }
}
