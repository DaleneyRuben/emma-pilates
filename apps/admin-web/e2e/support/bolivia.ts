// Bolivia civil time is UTC−4 all year (ADR-0057); the journeys name days
// the way the admin web does, whatever clock the runner keeps.
const dayMs = 86_400_000;

const civilIso = (instant: Date): string =>
  new Date(instant.getTime() - 4 * 3_600_000).toISOString();

const civil = (instant: Date): string => civilIso(instant).slice(0, 10);

/** The Bolivia date and `hh:mm` of an instant, as the admin web prints them. */
export const boliviaDateTime = (
  instant: Date,
): { date: string; time: string } => ({
  date: civil(instant),
  time: civilIso(instant).slice(11, 16),
});

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
