const wholeBolivianos = new Intl.NumberFormat("es-BO", {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

/**
 * Apps show whole bolivianos (UX-010). Stored amounts stay centavos; a leftover
 * fraction rounds half up and is never printed.
 */
export function formatBolivianos(centavos: number): string {
  const whole = Math.round(centavos / 100);
  return `Bs ${wholeBolivianos.format(whole)}`;
}
