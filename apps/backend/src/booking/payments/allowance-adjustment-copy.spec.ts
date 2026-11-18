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

  it('counts each origin when several gave the extra classes', () => {
    expect(
      extraClassesLine([
        { classes: 1, reason: 'invite_converted' },
        { classes: 1, reason: 'campaign' },
      ]),
    ).toBe('Clases extra: 2 · 1 de invitación · 1 de campaña');
    expect(
      extraClassesLine([
        { classes: 1, reason: 'gift_new_client' },
        { classes: 2, reason: 'campaign' },
        { classes: 1, reason: 'courtesy' },
        { classes: 1, reason: 'class_return' },
        { classes: 1, reason: 'campaign' },
      ]),
    ).toBe(
      'Clases extra: 6 · 1 de bienvenida · 3 de campaña · 1 de cortesía · 1 devuelta',
    );
  });

  it('keeps one origin in the single shape when it gave several classes', () => {
    expect(
      extraClassesLine([
        { classes: 1, reason: 'campaign' },
        { classes: 1, reason: 'campaign' },
      ]),
    ).toBe('Clases extra: 2 · Campaña');
  });

  it('names the origins without counts once some extra classes are spent', () => {
    expect(
      extraClassesLine([
        { classes: 1, reason: 'invite_converted' },
        { classes: 1, reason: 'campaign' },
        { classes: -1, reason: 'consumption' },
      ]),
    ).toBe('Clases extra: 1 · Invitación · Campaña');
  });
});
