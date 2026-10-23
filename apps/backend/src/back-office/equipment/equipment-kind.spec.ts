import { equipmentKindOfClassType } from './equipment-kind';

describe('the Equipment kind a Class Type uses', () => {
  it.each([
    ['Reformer Pilates', 'reformer'],
    ['Reformer Intermedio', 'reformer'],
    ['CADILLAC', 'cadillac'],
    ['Cadillac avanzado', 'cadillac'],
    ['Mat Pilates', 'mat'],
    ['Pilates en mat', 'mat'],
    ['Reformer y mat', 'reformer'],
    ['Cádillac', 'cadillac'],
  ])('reads %s as %s', (name, kind) => {
    expect(equipmentKindOfClassType(name)).toBe(kind);
  });

  it.each(['Pilates Prenatal', 'Barre', 'Matutino', 'Reformers', ''])(
    'reads %s as using no counted Equipment',
    (name) => {
      expect(equipmentKindOfClassType(name)).toBeNull();
    },
  );
});
