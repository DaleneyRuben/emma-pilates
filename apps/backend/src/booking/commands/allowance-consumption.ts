export type AllowancePools = {
  remainingClassAllowance: number;
  extraClasses: number;
};

// Placeholder so the failing tests type-check. The order is not implemented.
export const chooseAllowanceSource = (
  pools: AllowancePools,
): 'base' | 'extra' | null => {
  void pools;
  return null;
};
