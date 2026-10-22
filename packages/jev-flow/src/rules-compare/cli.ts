// La misma revisión, sin y con reglas, sobre los 5 fixtures de fixtures/reviews.
import fs from "node:fs";
import rules from "../../../../jev.rules.js";
import { askJev, mode } from "../jev/client.js";
import type { NoulAnswer } from "../jev/types.js";
import { appendJsonl, at } from "../paths.js";
import { usd } from "../prices.js";
import { decide, type Verdict } from "../review/review.js";
import { banner, table } from "../ui.js";

type Fixture = { name: string; subtask: string; file: string; diff: string; expected: Verdict };
const fixtures: Fixture[] = JSON.parse(fs.readFileSync(at("fixtures/reviews/fixtures.json"), "utf8"));

// Sin reglas: una sola pregunta amplia.
const broad = { safe_to_merge: { type: "noul" as const, instructions: "Is the change in `diff` good to merge?" } };
const broadVerdict = (p: number): Verdict => (p >= 0.6 ? "APROBAR" : p >= 0.4 ? "REVISAR" : "BLOQUEAR");

const rows: string[][] = [];
const totals = { broad: { tokens: 0, cost: 0, ok: 0 }, rules: { tokens: 0, cost: 0, ok: 0 } };
let simulated = false;

for (const f of fixtures) {
  const state = { declared_subtask: { id: f.subtask }, file: f.file, diff: f.diff };
  const a = await askJev(state, broad, `rules-compare:broad:${f.name}`);
  const b = await askJev(state, rules.review, `rules-compare:rules:${f.name}`);
  simulated ||= a.simulated || b.simulated;

  const pBroad = (a.answers.safe_to_merge as NoulAnswer).noul;
  const vBroad = broadVerdict(pBroad);
  const probs = Object.fromEntries(Object.entries(b.answers).map(([k, x]) => [k, (x as NoulAnswer).noul]));
  const d = decide(probs);

  totals.broad.tokens += a.usage.input_tokens;
  totals.broad.cost += a.costUsd;
  totals.broad.ok += vBroad === f.expected ? 1 : 0;
  totals.rules.tokens += b.usage.input_tokens;
  totals.rules.cost += b.costUsd;
  totals.rules.ok += d.verdict === f.expected ? 1 : 0;

  rows.push([
    f.name,
    f.expected,
    `${vBroad} (${pBroad.toFixed(2)})${vBroad === f.expected ? " ✓" : " ✗"}`,
    `${d.verdict}${d.verdict === f.expected ? " ✓" : " ✗"}`,
    d.reasons[0] ?? "—",
  ]);
}

banner("La misma revisión, sin y con reglas · 5 fixtures", simulated);
table(["Fixture", "Esperado", "Sin reglas: «¿está bien?»", "Con reglas", "Motivo (con reglas)"], rows);
console.log();
table(
  ["", "Sin reglas", "Con reglas"],
  [
    ["Tokens de entrada (5 PRs)", String(totals.broad.tokens), String(totals.rules.tokens)],
    ["Costo por PR", usd(totals.broad.cost / fixtures.length), usd(totals.rules.cost / fixtures.length)],
    ["Veredictos correctos", `${totals.broad.ok} de ${fixtures.length}`, `${totals.rules.ok} de ${fixtures.length}`],
    ["Motivo auditable", "no", "sí, por pregunta"],
  ],
);
console.log(`\nCon reglas se manda un poco más de entrada (más preguntas); la salida sigue siendo gratis. Modo ${mode()}.`);

appendJsonl("metrics/rules-compare-runs.jsonl", { ...totals, fixtures: fixtures.length, simulated, mode: mode() });
