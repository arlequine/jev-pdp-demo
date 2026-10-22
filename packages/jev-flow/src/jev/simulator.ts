// SOLO PARA GRABACIONES DE EJEMPLO (JEV_MODE=simulate).
// No es Jev: son respuestas plausibles escritas a mano para que la demo corra en replay
// antes de tener una API key. Cada grabación queda marcada con "simulated": true.
// Reemplázalas con respuestas reales: JEV_MODE=record npm run prioritize / review / rules:compare.
import type { Answer, JevRequest, JevResponse, Question } from "./types.js";

type Sim = Record<string, number | string>;

// Prioridad de PDP-142: score = índice 0–3 de la escala; noul = probabilidad de «sí»; area = opción.
const PRIORITIZE: Record<string, Sim> = {
  "PDP-142.1": { impact: 0.4, urgency: 0.1, complexity: 1.2, area: "performance", touches_money: 0.04, legal_or_compliance: 0.03, blocks_purchase: 0.05, cosmetic_only: 0.12 },
  "PDP-142.2": { impact: 1.6, urgency: 1.2, complexity: 0.9, area: "purchase_flow", touches_money: 0.06, legal_or_compliance: 0.05, blocks_purchase: 0.22, cosmetic_only: 0.08 },
  "PDP-142.3": { impact: 1.1, urgency: 0.3, complexity: 0.1, area: "content", touches_money: 0.03, legal_or_compliance: 0.04, blocks_purchase: 0.04, cosmetic_only: 0.94 },
  "PDP-142.4": { impact: 2.7, urgency: 3.0, complexity: 0.4, area: "price", touches_money: 0.97, legal_or_compliance: 0.83, blocks_purchase: 0.22, cosmetic_only: 0.02 },
  "PDP-142.5": { impact: 2.6, urgency: 2.7, complexity: 1.4, area: "purchase_flow", touches_money: 0.95, legal_or_compliance: 0.12, blocks_purchase: 0.18, cosmetic_only: 0.01 },
  "PDP-142.6": { impact: 2.8, urgency: 2.6, complexity: 0.5, area: "purchase_flow", touches_money: 0.08, legal_or_compliance: 0.21, blocks_purchase: 0.92, cosmetic_only: 0.18 },
  "PDP-142.7": { impact: 0.9, urgency: 1.2, complexity: 0.1, area: "accessibility", touches_money: 0.02, legal_or_compliance: 0.55, blocks_purchase: 0.06, cosmetic_only: 0.15 },
  "PDP-142.8": { impact: 1.4, urgency: 0.8, complexity: 2.3, area: "performance", touches_money: 0.05, legal_or_compliance: 0.03, blocks_purchase: 0.04, cosmetic_only: 0.03 },
  "PDP-142.9": { impact: 1.3, urgency: 1.1, complexity: 0.7, area: "content", touches_money: 0.03, legal_or_compliance: 0.06, blocks_purchase: 0.05, cosmetic_only: 0.41 },
  "PDP-142.10": { impact: 1.9, urgency: 1.0, complexity: 2.2, area: "out_of_scope", touches_money: 0.88, legal_or_compliance: 0.04, blocks_purchase: 0.06, cosmetic_only: 0.02 },
};

/** Revisión: heurísticas sobre las líneas AGREGADAS del diff (eso haría una persona en un segundo). */
function reviewSignals(state: any): Sim {
  const diff: string = state?.diff ?? "";
  const added = diff.split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++")).join("\n");
  const moved = new Set<string>(state?.moved_lines ?? []);
  const removed = diff
    .split("\n")
    .filter((l) => l.startsWith("-") && !l.startsWith("---") && !moved.has(l.slice(1).trim()))
    .join("\n");
  const unsanitized = /dangerouslySetInnerHTML/.test(added) && !/sanitize|DOMPurify/.test(added);
  const clientPrice = /price\s*:/.test(added) && /\/api\/cart|body:/.test(added);
  const dropsA11y = /alt=|aria-/.test(removed) && !/alt=|aria-/.test(added);
  const floatMoney = /\/\s*100\b(?!\))/.test(added) && /total|price/i.test(added) && !/format|Intl/.test(added);
  const handler = /app\.(post|put|patch)\(/.test(added);
  const unvalidated = handler && !/z\.|safeParse|parse\(/.test(added);
  return {
    renders_unsanitized_html: unsanitized ? 0.94 : 0.03,
    trusts_client_price: clientPrice ? 0.88 : 0.04,
    breaks_api_contract: 0.06,
    removes_accessibility: dropsA11y ? 0.81 : 0.04,
    money_as_float: floatMoney ? 0.62 : 0.05,
    unvalidated_input: unvalidated ? 0.86 : 0.05,
    matches_declared_subtask: unsanitized ? 0.31 : 0.91,
    // pregunta amplia de rules:compare (sin reglas): un número sin motivo
    safe_to_merge: unsanitized ? 0.46 : clientPrice ? 0.55 : 0.63,
  };
}

function scoreAnswer(q: Question, s: number): Answer {
  const n = (q as any).criteria.length as number;
  const lo = Math.floor(s);
  const hi = Math.min(n - 1, lo + 1);
  const frac = s - lo;
  const probabilities: Record<string, number> = {};
  for (let i = 0; i < n; i++) probabilities[String(i)] = 0;
  probabilities[String(lo)] += 1 - frac;
  probabilities[String(hi)] += frac;
  const top = Math.max(...Object.values(probabilities));
  return { type: "score", score: s, confidence: Math.round(top * 100) / 100, probabilities, legend: Object.fromEntries((q as any).criteria.map((c: string, i: number) => [String(i), c])) };
}

function choiceAnswer(q: Question, pick: string): Answer {
  const options = Object.keys((q as any).criteria);
  const probabilities: Record<string, number> = {};
  const rest = 0.14 / Math.max(1, options.length - 1);
  for (const o of options) probabilities[o] = o === pick ? 0.86 : Math.round(rest * 100) / 100;
  const n = options.length;
  return { type: "choice", choice: pick, confidence: Math.round(((0.86 - 1 / n) / (1 - 1 / n)) * 100) / 100, probabilities };
}

export function simulate(req: JevRequest, label: string): JevResponse {
  const sim: Sim = label.startsWith("prioritize:")
    ? PRIORITIZE[label.split(":")[1]] ?? {}
    : reviewSignals(req.state);
  const answers: Record<string, Answer> = {};
  for (const [id, q] of Object.entries(req.questions)) {
    const v = sim[id];
    if (q.type === "noul") answers[id] = { type: "noul", noul: typeof v === "number" ? v : 0.1 };
    else if (q.type === "score") answers[id] = scoreAnswer(q, typeof v === "number" ? v : 0.5);
    else answers[id] = choiceAnswer(q, typeof v === "string" ? v : Object.keys(q.criteria)[0]);
  }
  return {
    model: `${req.model}-20260917`,
    answers,
    usage: { input_tokens: Math.ceil(JSON.stringify(req).length / 3.6), output_tokens: 70 },
  };
}
