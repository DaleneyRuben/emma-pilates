// Follow-ups 02, 11, and 30: a Plan always lasts 1, 3, 6, or 12 months and
// always grants a fixed number of classes.
export const planDurations = [1, 3, 6, 12] as const;

export const durationLabel = (months: number): string =>
  months === 1 ? "1 mes" : `${months} meses`;

export const allowanceLabel = (classes: number): string =>
  classes === 1 ? "1 clase" : `${classes} clases`;
