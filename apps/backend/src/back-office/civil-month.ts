// A query's «YYYY-MM» as that month's first day at UTC midnight (ADR-0057),
// or null when it is not a real month, so the controller answers 400.
export const parseCivilMonth = (text: string | undefined): Date | null => {
  const match = /^(\d{4})-(\d{2})$/.exec(text ?? '');
  if (match === null) return null;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return new Date(Date.UTC(Number(match[1]), month - 1, 1));
};
