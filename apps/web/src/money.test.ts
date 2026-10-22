import { describe, expect, it } from "vitest";
import { formatMxn } from "./money.js";

describe("formatMxn", () => {
  it("criterio de aceptación de PDP-142.4: 150742 centavos se ven como $1,507.42", () => {
    expect(formatMxn(150742)).toBe("$1,507.42");
  });
});
