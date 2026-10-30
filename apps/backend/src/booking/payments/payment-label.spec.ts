import { saleLabel } from './payment-label';

describe('saleLabel', () => {
  it('names a paid evaluation instead of the plan snapshot', () => {
    expect(
      saleLabel({
        kind: 'evaluation',
        planNameSnapshot: 'Paquete de 8 clases',
      }),
    ).toBe('Evaluación nutricional');
  });

  it('keeps the plan name on a plan sale', () => {
    expect(
      saleLabel({
        kind: 'plan',
        planNameSnapshot: 'Paquete de 8 clases',
      }),
    ).toBe('Paquete de 8 clases');
  });
});
