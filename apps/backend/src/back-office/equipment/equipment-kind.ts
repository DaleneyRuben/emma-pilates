export const equipmentKinds = ['reformer', 'cadillac', 'mat'] as const;

export type EquipmentKind = (typeof equipmentKinds)[number];

const words = (name: string): string[] =>
  name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/);

// Back-office glossary «Equipment Kind of a Class Type»: the first of the
// kinds that appears in the name as a whole word, ignoring case and accents.
export const equipmentKindOfClassType = (
  name: string,
): EquipmentKind | null => {
  const found = new Set(words(name));
  return equipmentKinds.find((kind) => found.has(kind)) ?? null;
};
