export const recipientLine = (count: number): string =>
  count === 1 ? "1 clienta la recibirá." : `${count} clientas la recibirán.`;

export const grantedLine = (count: number, classes: number): string => {
  const clase = classes === 1 ? "1 clase extra" : `${classes} clases extra`;
  return count === 1
    ? `1 clienta recibió ${clase}.`
    : `${count} clientas recibieron ${clase}.`;
};

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
