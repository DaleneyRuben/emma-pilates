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
