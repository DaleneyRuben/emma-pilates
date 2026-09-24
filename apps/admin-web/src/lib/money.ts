/**
 * ADR-0082: every Money Amount is an integer number of BOB centavos; the
 * admin web formats it only here, always with two decimals as the design
 * system writes it (`Bs 1.200,00`). `@pilates/mobile-core` has a formatter
 * too, but it drops whole-boliviano decimals and admin web cannot depend on
 * a React Native package.
 */
const bolivianos = new Intl.NumberFormat("es-BO", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: "always",
});

export function formatBolivianos(centavos: number): string {
  return `Bs ${bolivianos.format(centavos / 100)}`;
}

/**
 * Reads a typed amount into centavos. The comma is the decimal separator
 * and dots group thousands, except a lone dot followed by one or two digits,
 * which someone typing on an English keyboard means as the decimal point.
 */
export function parseBolivianos(text: string): number | null {
  let value = text.trim().replace(/^Bs\s*/i, "");
  if (!value.includes(",") && /^\d+\.\d{1,2}$/.test(value)) {
    value = value.replace(".", ",");
  }
  const match = /^(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/.exec(value);
  if (match === null) return null;
  const whole = Number.parseInt(match[1].replaceAll(".", ""), 10);
  const fraction = Number.parseInt((match[2] ?? "0").padEnd(2, "0"), 10);
  return whole * 100 + fraction;
}
