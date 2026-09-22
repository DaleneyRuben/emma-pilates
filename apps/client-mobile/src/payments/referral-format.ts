const dayMonthFormatter = new Intl.DateTimeFormat("es-BO", {
  day: "numeric",
  month: "long",
  timeZone: "America/La_Paz",
});

export function formatReferralDate(instant: string): string {
  return dayMonthFormatter.format(new Date(instant));
}
