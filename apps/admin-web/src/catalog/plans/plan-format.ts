// Booking ADR-0005 and ADR-0006 (follow-up 175): a Plan lasts 30, 60, or
// 90 days, only the 60- and 90-day Plans may cap the week at 3 or 4 classes,
// and every Plan grants a fixed number of classes.
export const planDurations = [30, 60, 90] as const;
export const weeklyClassCaps = [3, 4] as const;

export const durationLabel = (days: number): string => `${days} días`;

export const weeklyCapLabel = (cap: number | null): string =>
  cap === null ? "Sin tope" : `${cap} por semana`;

export const allowanceLabel = (classes: number): string =>
  classes === 1 ? "1 clase" : `${classes} clases`;
