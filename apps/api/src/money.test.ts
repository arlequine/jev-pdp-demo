import { describe, expect, it } from "vitest";
import { withIva } from "./money.js";

describe("withIva", () => {
  it("criterio de aceptación de PDP-142.4: $1,299.50 + IVA = 150742 centavos", () => {
    expect(withIva(129950)).toBe(150742);
  });

  it("siempre regresa centavos enteros", () => {
    expect(Number.isInteger(withIva(999))).toBe(true);
  });
});
