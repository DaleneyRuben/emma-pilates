import { equipmentKinds, type EquipmentKind } from './equipment-kind';

export const equipmentTrackings = ['unit', 'quantity'] as const;

export type EquipmentTracking = (typeof equipmentTrackings)[number];

// FIX-067: a studio-wide Equipment Type. The three seeded types carry the
// kind old Staff app builds know (legacyKind); the studio's own carry none.
export type EquipmentTypeView = {
  id: string;
  name: string;
  tracking: EquipmentTracking;
  legacyKind: EquipmentKind | null;
};

const legacyRank = (kind: EquipmentKind | null): number =>
  kind === null ? equipmentKinds.length : equipmentKinds.indexOf(kind);

// The seeded types in their old order, then the rest by name, ignoring case
// and accents.
export const compareEquipmentTypes = (
  first: Pick<EquipmentTypeView, 'id' | 'name' | 'legacyKind'>,
  second: Pick<EquipmentTypeView, 'id' | 'name' | 'legacyKind'>,
): number =>
  legacyRank(first.legacyKind) - legacyRank(second.legacyKind) ||
  first.name.localeCompare(second.name, 'es', { sensitivity: 'base' }) ||
  first.id.localeCompare(second.id);

export const words = (name: string): string[] =>
  name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word !== '');

const containsRun = (haystack: string[], needle: string[]): boolean =>
  needle.length > 0 &&
  haystack.some((_, start) =>
    needle.every((word, offset) => haystack[start + offset] === word),
  );

// Back-office glossary «Equipment Type of a Class Type»: the first unit type,
// in type order, whose name appears in the Class Type's name as whole words,
// ignoring case and accents.
export const equipmentTypeOfClassType = <
  Type extends Pick<
    EquipmentTypeView,
    'id' | 'name' | 'tracking' | 'legacyKind'
  >,
>(
  name: string,
  types: readonly Type[],
): Type | null => {
  const found = words(name);
  return (
    [...types]
      .filter((type) => type.tracking === 'unit')
      .sort(compareEquipmentTypes)
      .find((type) => containsRun(found, words(type.name))) ?? null
  );
};
