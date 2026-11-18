import {
  compareEquipmentTypes,
  equipmentTypeOfClassType,
  type EquipmentTypeView,
} from './equipment-types';

const type = (
  id: string,
  name: string,
  tracking: 'unit' | 'quantity' = 'unit',
  legacyKind: EquipmentTypeView['legacyKind'] = null,
): EquipmentTypeView => ({ id, name, tracking, legacyKind });

const mat = type('m', 'Mat', 'unit', 'mat');
const reformer = type('r', 'Reformer', 'unit', 'reformer');
const cadillac = type('c', 'Cadillac', 'unit', 'cadillac');
const balones = type('b', 'Balones', 'quantity');
const aros = type('a', 'aros', 'quantity');
const silla = type('s', 'Silla Wunda');
const enes = type('e', 'Ébano');

describe('the order of Equipment Types', () => {
  it('puts the three seeded types first, then the rest by name ignoring case and accents', () => {
    expect(
      [silla, enes, mat, balones, reformer, aros, cadillac]
        .sort(compareEquipmentTypes)
        .map((item) => item.name),
    ).toEqual([
      'Reformer',
      'Cadillac',
      'Mat',
      'aros',
      'Balones',
      'Ébano',
      'Silla Wunda',
    ]);
  });
});

describe('the Equipment Type a Class Type uses', () => {
  const types = [reformer, cadillac, mat, balones, silla, type('t', 'Torre')];

  it.each([
    ['Reformer Pilates', 'r'],
    ['Pilates en mat', 'm'],
    ['Reformer y mat', 'r'],
    ['Cádillac', 'c'],
    ['Silla Wunda intermedio', 's'],
    ['TORRE avanzada', 't'],
  ])('reads %s as the type %s', (name, id) => {
    expect(equipmentTypeOfClassType(name, types)?.id).toBe(id);
  });

  it.each(['Pilates Prenatal', 'Balones', 'Silla', 'Reformers', 'Matutino'])(
    'reads %s as using no unit type',
    (name) => {
      expect(equipmentTypeOfClassType(name, types)).toBeNull();
    },
  );

  it('follows a renamed seeded type', () => {
    expect(
      equipmentTypeOfClassType('Reformer Pilates', [
        { ...reformer, name: 'Camilla' },
      ]),
    ).toBeNull();
  });
});
