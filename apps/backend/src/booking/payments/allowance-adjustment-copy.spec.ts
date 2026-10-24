import { extraClassesLine } from './allowance-adjustment-copy';

describe('extraClassesLine', () => {
  it('names one gift exactly as the screens show it', () => {
    expect(extraClassesLine([{ classes: 1, reason: 'gift_new_client' }])).toBe(
      'Clases extra: 1 · Regalo de bienvenida',
    );
  });

  it('names each origin a person sees', () => {
    expect(extraClassesLine([{ classes: 2, reason: 'campaign' }])).toBe(
      'Clases extra: 2 · Campaña',
    );
    expect(extraClassesLine([{ classes: 1, reason: 'invite_converted' }])).toBe(
      'Clases extra: 1 · Invitación',
    );
    expect(extraClassesLine([{ classes: 1, reason: 'courtesy' }])).toBe(
      'Clases extra: 1 · Cortesía',
    );
    expect(extraClassesLine([{ classes: 1, reason: 'class_return' }])).toBe(
      'Clases extra: 1 · Clase devuelta',
    );
  });

  it('hides the line once the extra classes are spent', () => {
    expect(
      extraClassesLine([
        { classes: 1, reason: 'gift_new_client' },
        { classes: -1, reason: 'consumption' },
      ]),
    ).toBeNull();
  });
});
