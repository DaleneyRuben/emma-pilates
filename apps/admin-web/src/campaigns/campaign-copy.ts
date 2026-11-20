import {
  boliviaParts,
  boliviaToday,
  formatDayMonth,
} from "../lib/bolivia-time";

export const recipientLine = (count: number): string =>
  count === 1 ? "1 clienta la recibirá." : `${count} clientas la recibirán.`;

export const grantedLine = (count: number, classes: number): string => {
  const clase = classes === 1 ? "1 clase extra" : `${classes} clases extra`;
  return count === 1
    ? `1 clienta recibió ${clase}.`
    : `${count} clientas recibieron ${clase}.`;
};

// FIX-091 (W13 A): the panel's summary and its button.
const classCount = (total: number): string =>
  total === 1 ? "1 clase" : `${total} clases`;

export const totalLine = (total: number): string =>
  `Vas a regalar ${classCount(total)} en total`;

export const giveLabel = (total: number | null): string =>
  total === null ? "Regalar las clases" : `Regalar ${classCount(total)}`;

// FIX-064 (walkthrough finding 90): every active Client gets the classes. A
// Client without a current Plan gets them when her next Plan is activated.
// Every lapsed Client is owed, so the list can be long.
const shownNames = 10;

export const owedLine = (owed: readonly { name: string }[]): string | null => {
  if (owed.length === 0) return null;
  const shown = owed.slice(0, shownNames).map((client) => client.name);
  const rest = owed.length - shown.length;
  const names =
    rest === 0 ? shown.join(", ") : `${shown.join(", ")} y ${rest} más`;
  return owed.length === 1
    ? `1 sin plan: se le suma en su próximo plan (${names}).`
    : `${owed.length} sin plan: se les suma en su próximo plan (${names}).`;
};

// Walkthrough finding 92: a campaign has no table, so giving one twice gives
// the classes twice. The page warns while the name matches one already given.
const sameName = (name: string): string =>
  name.trim().replace(/\s+/g, " ").toLocaleLowerCase("es");

export const pastCampaignLine = (
  name: string,
  past: readonly { name: string; grantedAt: string }[],
  now: Date = new Date(),
): string | null => {
  const typed = sameName(name);
  if (typed === "") return null;
  const match = past.find((campaign) => sameName(campaign.name) === typed);
  if (match === undefined) return null;
  const { date } = boliviaParts(match.grantedAt);
  const year = date.slice(0, 4);
  const day =
    year === boliviaToday(now).slice(0, 4)
      ? formatDayMonth(date)
      : `${formatDayMonth(date)} de ${year}`;
  return `Ya diste la campaña «${match.name}» el ${day}. Si la das otra vez, cada clienta recibe las clases de nuevo.`;
};
