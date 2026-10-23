export type AllowancePools = {
  remainingClassAllowance: number;
  extraClasses: number;
};

// BKM-008: base allowance first, then extra classes. BKM-007's weekly cap
// calls this same function once the cap blocks the base, passing a base of
// zero, so an extra class funds the Booking without counting toward the cap.
export const chooseAllowanceSource = (
  pools: AllowancePools,
): 'base' | 'extra' | null => {
  if (pools.remainingClassAllowance > 0) return 'base';
  if (pools.extraClasses > 0) return 'extra';
  return null;
};
