// Date-only values represent Bolivia civil dates encoded at UTC midnight (ADR-0057).
export const boliviaDate = (instant: Date): Date => {
  const fields = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/La_Paz',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .formatToParts(instant)
    .reduce<Record<string, string>>((result, part) => {
      result[part.type] = part.value;
      return result;
    }, {});

  return new Date(
    Date.UTC(Number(fields.year), Number(fields.month) - 1, Number(fields.day)),
  );
};

const dayMilliseconds = 24 * 60 * 60 * 1_000;

const offsetMilliseconds = (instant: Date): number => {
  const fields = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/La_Paz',
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  })
    .formatToParts(instant)
    .reduce<Record<string, number>>((result, part) => {
      if (part.type !== 'literal') result[part.type] = Number(part.value);
      return result;
    }, {});

  return (
    Date.UTC(
      fields.year,
      fields.month - 1,
      fields.day,
      fields.hour,
      fields.minute,
      fields.second,
    ) -
    Math.floor(instant.getTime() / 1_000) * 1_000
  );
};

// The instant of a Bolivia wall-clock time on a civil date, resolved through
// the tz database rather than a fixed offset.
export const boliviaInstant = (civilDate: Date, minuteOfDay: number): Date => {
  const wallClock = civilDate.getTime() + minuteOfDay * 60 * 1_000;
  return new Date(wallClock - offsetMilliseconds(new Date(wallClock)));
};

export const boliviaMonth = (instant: Date): Date => {
  const date = boliviaDate(instant);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
};

// ISO weekday of a civil date: Monday is 1 and Sunday is 7.
export const isoWeekday = (civilDate: Date): number =>
  civilDate.getUTCDay() === 0 ? 7 : civilDate.getUTCDay();

export const addCivilDays = (civilDate: Date, days: number): Date =>
  new Date(civilDate.getTime() + days * dayMilliseconds);
