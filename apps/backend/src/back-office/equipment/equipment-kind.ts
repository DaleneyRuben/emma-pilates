export const equipmentKinds = ['reformer', 'cadillac', 'mat'] as const;

export type EquipmentKind = (typeof equipmentKinds)[number];

export const equipmentKindOfClassType = (name: string): EquipmentKind | null =>
  name === '' ? null : null;
