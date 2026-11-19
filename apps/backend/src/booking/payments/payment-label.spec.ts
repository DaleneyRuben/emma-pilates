import { invoiceReadyMessage, saleLabel } from './payment-label';

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

// FIX-090 (audit: «La factura de tu 8 clases»): the invoice notice names the
// plan or the evaluation in a sentence that reads.
describe('invoiceReadyMessage', () => {
  it('names a plan sale as «tu plan …»', () => {
    expect(
      invoiceReadyMessage({
        kind: 'SUBSCRIPTION',
        planNameSnapshot: '8 clases',
      }),
    ).toBe('La factura de tu plan 8 clases ya está en Mis facturas.');
  });

  it('names an evaluation sale as «tu evaluación nutricional»', () => {
    expect(
      invoiceReadyMessage({ kind: 'EVALUATION', planNameSnapshot: '8 clases' }),
    ).toBe('La factura de tu evaluación nutricional ya está en Mis facturas.');
  });
});
