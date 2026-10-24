import { boliviaCivilDate, upcomingCivilDates } from "../time/session-format";

export type StartDateOption = {
  date: string;
  label: string;
  weekday: string;
  day: string;
};

const addDays = (civilDate: string, days: number): string => {
  const date = new Date(`${civilDate}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

// booking ADR-0005: today through today plus the Studio Settings limit, and
// the Opening Date itself while it is still ahead, even past the limit.
export function startDateOptions(input: {
  today?: string;
  startDateLimitDays: number;
  openingDate: string | null;
}): StartDateOption[] {
  const today = input.today ?? boliviaCivilDate(new Date());
  const window = upcomingCivilDates(today, input.startDateLimitDays + 1);
  const latest = window[window.length - 1] ?? today;
  const presale =
    input.openingDate !== null && input.openingDate > today && input.openingDate > latest
      ? input.openingDate
      : null;
  const dates = presale === null ? window : [...window, presale];

  return dates.map((date, index) => ({
    date,
    label: index === 0 ? "Hoy" : presale === date ? "Día de apertura" : date,
    weekday: index === 0 ? "Hoy" : presale === date ? "Día de apertura" : "",
    day: date.slice(8, 10).replace(/^0/, ""),
  }));
}

export function renewalStartsOn(currentEndsOn: string): string {
  return addDays(currentEndsOn, 1);
}
