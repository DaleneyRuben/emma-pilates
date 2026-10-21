// Bolivia civil time is UTC−4 all year (ADR-0057); the journeys name days
// the way the admin web does, whatever clock the runner keeps.
const dayMs = 86_400_000;

const civil = (instant: Date): string =>
  new Date(instant.getTime() - 4 * 3_600_000).toISOString().slice(0, 10);

export const boliviaToday = (): string => civil(new Date());

export const addDays = (date: string, days: number): string =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * dayMs)
    .toISOString()
    .slice(0, 10);

/** The Monday of the week holding `date` (Monday-first, as Horario). */
export const weekStartOf = (date: string): string => {
  const weekday = new Date(Date.parse(`${date}T00:00:00Z`)).getUTCDay();
  return addDays(date, weekday === 0 ? -6 : 1 - weekday);
};

/** `dd/mm/aaaa`, the civil date the admin web prints. */
export const formatCivilDate = (date: string): string => {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
};
