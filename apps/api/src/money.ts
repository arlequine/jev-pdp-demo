import { IVA_RATE_PERCENT } from "./catalog.js";

/** Precio con IVA en centavos enteros. 129950 → 150742. */
export function withIva(cents: number): number {
  return Math.round((cents * (100 + IVA_RATE_PERCENT)) / 100);
}
