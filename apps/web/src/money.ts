const mxn = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

/** La web solo formatea: los centavos (con IVA) los calcula la API. */
export function formatMxn(cents: number): string {
  return mxn.format(cents / 100);
}
