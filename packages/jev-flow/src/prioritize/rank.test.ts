import { describe, expect, it } from "vitest";
import rules from "../../../../jev.rules.js";
import type { Answer } from "../jev/types.js";
import type { Subtask } from "../ticket.js";
import { estimateLevel, rank } from "./rank.js";

const score = (s: number): Answer => ({ type: "score", score: s, confidence: 0.9, probabilities: {} });
const noul = (p: number): Answer => ({ type: "noul", noul: p });
const area = (pick: string): Answer => ({ type: "choice", choice: pick, confidence: 0.8, probabilities: { [pick]: 0.86, other: 0.14 } });

const sub = (id: string, estimate = 2, dependsOn?: string[]): Subtask => ({ id, title: id, description: "", author: "dev", estimate, dependsOn });
const answers = (o: Partial<Record<string, Answer>>): Record<string, Answer> => ({
  impact: score(1),
  urgency: score(1),
  complexity: score(0),
  area: area("content"),
  touches_money: noul(0.05),
  legal_or_compliance: noul(0.05),
  blocks_purchase: noul(0.05),
  cosmetic_only: noul(0.05),
  ...o,
}) as Record<string, Answer>;

describe("rank", () => {
  it("excluye lo que está fuera de alcance aunque toque dinero", () => {
    const plan = rank([sub("a")], { a: answers({ area: area("out_of_scope"), touches_money: noul(0.95) }) }, rules.thresholds);
    expect(plan.excluded.map((e) => e.id)).toEqual(["a"]);
  });

  it("sube la urgencia a 4 si bloquea la compra", () => {
    const plan = rank([sub("a")], { a: answers({ blocks_purchase: noul(0.9) }) }, rules.thresholds);
    expect(plan.order[0].urgency).toBe(4);
  });

  it("deja el «URGENTE!!!» estético abajo", () => {
    const plan = rank(
      [sub("urgente", 1), sub("precio", 2)],
      {
        urgente: answers({ impact: score(2), urgency: score(0.3), cosmetic_only: noul(0.94) }),
        precio: answers({ impact: score(2.7), urgency: score(2), touches_money: noul(0.97) }),
      },
      rules.thresholds,
    );
    expect(plan.order.map((r) => r.id)).toEqual(["precio", "urgente"]);
    expect(plan.order[1].impact).toBe(1);
  });

  it("marca «Necesita PM» si Jev y la estimación difieren 2 niveles o más", () => {
    const plan = rank([sub("a", 8)], { a: answers({ complexity: score(0) }) }, rules.thresholds);
    expect(plan.order[0].needsPm.length).toBeGreaterThan(0);
    expect(plan.order[0].complexity).toBe(estimateLevel(8));
  });

  it("respeta dependencias", () => {
    const plan = rank(
      [sub("base", 5), sub("depende", 1, ["base"])],
      { base: answers({ impact: score(0) }), depende: answers({ impact: score(3), urgency: score(3) }) },
      rules.thresholds,
    );
    expect(plan.order.map((r) => r.id)).toEqual(["base", "depende"]);
  });
});
