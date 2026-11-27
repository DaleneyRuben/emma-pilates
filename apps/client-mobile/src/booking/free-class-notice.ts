import { agendaDayChipLabel, boliviaCivilDate, formatStartTime } from "@pilates/mobile-core";

/**
 * Walkthrough n.º 19 (C05j): booking the free class is good news, with its
 * day and time: «Usaste tu clase gratis. ¡Te esperamos el sáb 28 a las 13:00!»
 */
export function usedFreeClass(startsAt: string): string {
  const { weekday, day } = agendaDayChipLabel(boliviaCivilDate(new Date(startsAt)));
  return `Usaste tu clase gratis. ¡Te esperamos el ${weekday.toLowerCase()} ${day} a las ${formatStartTime(startsAt)}!`;
}
