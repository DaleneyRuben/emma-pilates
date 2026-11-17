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

// FIX-060 (walkthrough finding 87): a founder is left out for being one, not
// for lacking a Plan. An older backend sends no reason: no Plan, as before.
type Skipped = {
  name: string;
  reason?: "founder" | "no_current_plan";
};

const byReason = (skipped: readonly Skipped[]) => ({
  founders: skipped.filter((client) => client.reason === "founder"),
  withoutPlan: skipped.filter((client) => client.reason !== "founder"),
});

const names = (skipped: readonly Skipped[]) =>
  skipped.map((client) => client.name).join(", ");

const sentences = (parts: (string | null)[]): string | null => {
  const kept = parts.filter((part): part is string => part !== null);
  return kept.length === 0 ? null : kept.join(" ");
};

/** After the grant: who got nothing, and why. */
export const skippedLine = (skipped: readonly Skipped[]): string | null => {
  const { founders, withoutPlan } = byReason(skipped);
  return sentences([
    founders.length === 0
      ? null
      : founders.length === 1
        ? `1 fundadora no entra en campañas: ${names(founders)}.`
        : `${founders.length} fundadoras no entran en campañas: ${names(founders)}.`,
    withoutPlan.length === 0
      ? null
      : `${clientas(withoutPlan.length)} ${withoutPlan.length === 1 ? "no tiene" : "no tienen"} un plan vigente: ${names(withoutPlan)}.`,
  ]);
};

/** Before the grant: who will get nothing, and why. */
export const skippedPreview = (skipped: readonly Skipped[]): string | null => {
  const { founders, withoutPlan } = byReason(skipped);
  return sentences([
    founders.length === 0
      ? null
      : founders.length === 1
        ? `${names(founders)} es fundadora y no entra en campañas.`
        : `${founders.length} son fundadoras y no entran en campañas: ${names(founders)}.`,
    withoutPlan.length === 0
      ? null
      : withoutPlan.length === 1
        ? `${names(withoutPlan)} no tiene un plan vigente.`
        : `${clientas(withoutPlan.length)} no tienen un plan vigente: ${names(withoutPlan)}.`,
  ]);
};
