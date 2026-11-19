import { parseDecideFreeze } from './freeze.dto';

// W16 B/C: the refusal reason travels with a refusal only.
describe('parseDecideFreeze', () => {
  it('keeps a trimmed refusal reason with a refusal', () => {
    expect(
      parseDecideFreeze({
        decision: 'refused',
        refusalReason: '  Esas fechas el estudio está cerrado  ',
      }),
    ).toEqual({
      decision: 'refused',
      refusalReason: 'Esas fechas el estudio está cerrado',
    });
  });

  it('drops a blank reason and accepts the earlier body', () => {
    expect(
      parseDecideFreeze({ decision: 'refused', refusalReason: '   ' }),
    ).toEqual({ decision: 'refused' });
    expect(parseDecideFreeze({ decision: 'approved' })).toEqual({
      decision: 'approved',
    });
    expect(
      parseDecideFreeze({ decision: 'approved', refusalReason: '   ' }),
    ).toEqual({ decision: 'approved' });
  });

  it('refuses a reason on an approval or longer than 300 characters', () => {
    expect(
      parseDecideFreeze({ decision: 'approved', refusalReason: 'No' }),
    ).toBeNull();
    expect(
      parseDecideFreeze({
        decision: 'refused',
        refusalReason: 'x'.repeat(301),
      }),
    ).toBeNull();
  });
});
