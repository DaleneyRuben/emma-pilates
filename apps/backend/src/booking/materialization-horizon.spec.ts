import { materializationHorizon } from './materialization-horizon';

const civil = (date: string): Date => new Date(`${date}T00:00:00.000Z`);

describe('materialization horizon', () => {
  it('covers Bolivia dates from today through today + 30', () => {
    expect(materializationHorizon(civil('2026-09-22'))).toEqual({
      from: civil('2026-09-22'),
      through: civil('2026-10-22'),
    });
  });
});
