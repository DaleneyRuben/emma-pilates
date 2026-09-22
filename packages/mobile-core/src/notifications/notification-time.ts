const boliviaTimeZone = "America/La_Paz";

function boliviaCivilDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: boliviaTimeZone,
    year: "numeric",
  }).format(date);
}

function boliviaClock(date: Date): string {
  return new Intl.DateTimeFormat("es-BO", {
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    timeZone: boliviaTimeZone,
  }).format(date);
}

function plural(amount: number, singular: string, pluralForm: string): string {
  return `Hace ${amount} ${amount === 1 ? singular : pluralForm}`;
}

export function formatNotificationTime(createdAt: string, now: Date): string {
  const created = new Date(createdAt);
  const elapsedMinutes = Math.max(
    0,
    Math.floor((now.getTime() - created.getTime()) / 60_000),
  );

  if (elapsedMinutes < 60) return plural(elapsedMinutes, "minuto", "minutos");

  const yesterday = new Date(now.getTime() - 24 * 60 * 60_000);
  if (boliviaCivilDate(created) === boliviaCivilDate(yesterday)) {
    return `Ayer, ${boliviaClock(created)}`;
  }
  if (elapsedMinutes < 24 * 60) {
    return plural(Math.floor(elapsedMinutes / 60), "hora", "horas");
  }

  return plural(
    Math.max(2, Math.floor(elapsedMinutes / (24 * 60))),
    "día",
    "días",
  );
}
