// Todos los montos viajan como enteros en centavos.
// Moneda: peso colombiano. En la práctica no se usan centavos, así que se formatea sin decimales.

const formatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** 12.5 → 1250 */
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

/** 1250 → 12.5 */
export function fromCents(cents: number): number {
  return cents / 100;
}

/** 350000 → "$ 3.500" */
export function formatMoney(cents: number): string {
  return formatter.format(cents / 100);
}
