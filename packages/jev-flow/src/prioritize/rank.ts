// El orden es código. Jev da probabilidades; estas reglas son la política del equipo.
import type { Answer, ChoiceAnswer, NoulAnswer, ScoreAnswer } from "../jev/types.js";
import type { Rules } from "../rules.js";
import type { Subtask } from "../ticket.js";

export type Ranked = {
  id: string;
  title: string;
  impact: number;
  urgency: number;
  complexity: number;
  priority: number;
  reasons: string[];
  needsPm: string[];
};
export type Excluded = { id: string; title: string; reason: string };
export type Plan = { order: Ranked[]; excluded: Excluded[] };

const lvl = (a: Answer) => Math.round((a as ScoreAnswer).score) + 1; // índice 0–3 → nivel 1–4
const p = (a: Answer) => (a as NoulAnswer).noul;
const prob = (a: Answer, option: string) => (a as ChoiceAnswer).probabilities[option] ?? 0;

/** Estimación del equipo (puntos) → nivel de complejidad 1–4. */
export function estimateLevel(points: number) {
  if (points <= 2) return 1;
  if (points <= 3) return 2;
  if (points <= 5) return 3;
  return 4;
}

export function rankOne(s: Subtask, a: Record<string, Answer>, t: Rules["thresholds"]): Ranked | Excluded {
  if (prob(a.area, "out_of_scope") >= t.outOfScope) {
    return { id: s.id, title: s.title, reason: "fuera de alcance" };
  }
  const reasons: string[] = [];
  const needsPm: string[] = [];
  let impact = lvl(a.impact);
  let urgency = lvl(a.urgency);
  let complexity = lvl(a.complexity);

  if (p(a.blocks_purchase) >= t.hardRule) {
    urgency = 4;
    reasons.push("urgencia 4: bloquea la compra");
  } else if (p(a.legal_or_compliance) >= t.hardRule) {
    urgency = 4;
    reasons.push("urgencia 4: obligación legal");
  }
  if (p(a.touches_money) >= t.hardRule && urgency < 3) {
    urgency = 3;
    reasons.push("urgencia mínima 3: toca dinero");
  } else if (p(a.touches_money) >= t.hardRule) {
    reasons.push("toca dinero");
  }
  if (p(a.cosmetic_only) >= t.hardRule && impact > 1) {
    impact = 1;
    reasons.push("impacto 1: solo estético");
  }

  const est = estimateLevel(s.estimate);
  if (Math.abs(est - complexity) >= 2) {
    needsPm.push(`Jev dice complejidad ${complexity}, el equipo estimó ${est}`);
    complexity = est;
  }
  const [lo, hi] = t.needsPm;
  for (const key of ["touches_money", "legal_or_compliance", "blocks_purchase"]) {
    const v = p(a[key]);
    if (v >= lo && v < hi) needsPm.push(`${key} dudoso (${v.toFixed(2)})`);
  }
  const area = a.area as ChoiceAnswer;
  if (Math.max(...Object.values(area.probabilities)) < 0.5) needsPm.push("área dudosa");

  const priority = Math.round(((impact + urgency) / complexity) * 100) / 100;
  if (!reasons.length) reasons.push(`impacto ${impact} · urgencia ${urgency} · complejidad ${complexity}`);
  return { id: s.id, title: s.title, impact, urgency, complexity, priority, reasons, needsPm };
}

export function rank(subtasks: Subtask[], answers: Record<string, Record<string, Answer>>, t: Rules["thresholds"]): Plan {
  const ranked: Ranked[] = [];
  const excluded: Excluded[] = [];
  for (const s of subtasks) {
    const r = rankOne(s, answers[s.id], t);
    if ("reason" in r) excluded.push(r);
    else ranked.push(r);
  }
  ranked.sort((x, y) => y.priority - x.priority || y.urgency - x.urgency);
  return { order: topological(ranked, subtasks), excluded };
}

/** Respeta dependencias: una subtarea nunca queda antes de la que necesita. */
function topological(order: Ranked[], subtasks: Subtask[]) {
  const deps = new Map(subtasks.map((s) => [s.id, s.dependsOn ?? []]));
  const out: Ranked[] = [];
  const pending = [...order];
  while (pending.length) {
    const i = pending.findIndex((r) => (deps.get(r.id) ?? []).every((d) => out.some((o) => o.id === d) || !order.some((o) => o.id === d)));
    out.push(...pending.splice(i === -1 ? 0 : i, 1));
  }
  return out;
}
