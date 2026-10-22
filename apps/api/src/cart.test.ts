import { describe, expect, it } from "vitest";
import { withIva } from "./money.js";
import { findBySku } from "./catalog.js";

describe("carrito", () => {
  it("el total sale del catálogo con IVA, no del navegador", () => {
    const p = findBySku("PLY-BAS-001")!;
    expect(withIva(p.priceCents) * 1).toBe(150742);
  });
});
