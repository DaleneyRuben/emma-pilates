const timeZone = "America/La_Paz";
const boliviaOffset = "-04:00";

const civilDateFormatter = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  month: "2-digit",
  timeZone,
  year: "numeric",
});
const weekdayFormatter = new Intl.DateTimeFormat("es-BO", {
  timeZone: "UTC",
  weekday: "short",
});
const timeFormatter = new Intl.DateTimeFormat("es-BO", {
  hour: "2-digit",
  hour12: false,
  minute: "2-digit",
  timeZone,
});
const longDateFormatter = new Intl.DateTimeFormat("es-BO", {
  day: "numeric",
  month: "long",
  timeZone,
  weekday: "long",
});

export function boliviaCivilDate(instant: Date): string {
  return civilDateFormatter.format(instant);
}

export function upcomingCivilDates(today: string, count: number): string[] {
  const start = new Date(`${today}T12:00:00.000Z`);
  return Array.from({ length: count }, (_, offset) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + offset);
    return date.toISOString().slice(0, 10);
  });
}

export function dayChipLabel(civilDate: string): {
  weekday: string;
  day: string;
} {
  const date = new Date(`${civilDate}T12:00:00.000Z`);
  return {
    weekday: weekdayFormatter.format(date).replace(".", ""),
    day: String(date.getUTCDate()),
  };
}

export function civilDateRange(civilDate: string): {
  from: string;
  until: string;
} {
  const from = new Date(`${civilDate}T00:00:00.000${boliviaOffset}`);
  const until = new Date(from.getTime() + 24 * 60 * 60 * 1_000);
  return { from: from.toISOString(), until: until.toISOString() };
}

export function formatTimeRange(startsAt: string, endsAt: string): string {
  return `${timeFormatter.format(new Date(startsAt))} – ${timeFormatter.format(new Date(endsAt))}`;
}

// A Session that has started takes no Booking and cannot be cancelled, so
// the lists that lead to either leave it out (03, S07, S13).
export function hasStarted(startsAt: string, now: Date): boolean {
  return new Date(startsAt).getTime() <= now.getTime();
}

const cancellationWindowMs = 2.5 * 60 * 60 * 1_000;

export function isInsideCancellationWindow(
  startsAt: string,
  now: Date,
): boolean {
  return new Date(startsAt).getTime() - now.getTime() <= cancellationWindowMs;
}

const monthFormatter = new Intl.DateTimeFormat("es-BO", {
  month: "long",
  timeZone,
  year: "numeric",
});

export function formatMonthHeading(startsAt: string): string {
  const label = monthFormatter.format(new Date(startsAt)).replace(" de ", " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatSessionDate(startsAt: string): string {
  return longDateFormatter.format(new Date(startsAt)).replace(",", "");
}
