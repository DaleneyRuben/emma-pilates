const clientas = (count: number) =>
  count === 1 ? "1 clienta" : `${count} clientas`;

export const recipientLine = (count: number): string =>
  count === 1 ? "1 clienta la recibirá." : `${count} clientas la recibirán.`;

export const grantedLine = (count: number, classes: number): string => {
  const clase = classes === 1 ? "1 clase extra" : `${classes} clases extra`;
  return count === 1
    ? `1 clienta recibió ${clase}.`
    : `${count} clientas recibieron ${clase}.`;
};

export const skippedLine = (
  skipped: readonly { name: string }[],
): string | null => {
  if (skipped.length === 0) return null;
  const names = skipped.map((client) => client.name).join(", ");
  const verb = skipped.length === 1 ? "no tiene" : "no tienen";
  return `${clientas(skipped.length)} ${verb} un plan vigente: ${names}.`;
};

export const skippedPreview = (
  skipped: readonly { name: string }[],
): string | null => {
  if (skipped.length === 0) return null;
  const names = skipped.map((client) => client.name).join(", ");
  return skipped.length === 1
    ? `${names} no tiene un plan vigente.`
    : `${clientas(skipped.length)} no tienen un plan vigente: ${names}.`;
};
