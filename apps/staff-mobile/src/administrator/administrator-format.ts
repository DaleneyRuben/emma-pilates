const dayMonthFormatter = new Intl.DateTimeFormat("es-BO", {
  day: "numeric",
  month: "long",
  timeZone: "America/La_Paz",
});
const clockFormatter = new Intl.DateTimeFormat("es-BO", {
  hour: "2-digit",
  hour12: false,
  minute: "2-digit",
  timeZone: "America/La_Paz",
});

export function formatSubmittedAt(instant: string): string {
  const date = new Date(instant);
  return `${dayMonthFormatter.format(date)}, ${clockFormatter.format(date)}`;
}

export function describeCount(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
