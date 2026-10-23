// Mismo ticket, mismos criterios: Jev + rank.ts contra Opus con «prompt y parseo».
import { mode } from "../jev/client.js";
import { appendJsonl } from "../paths.js";
import { usd } from "../prices.js";
import { evaluate } from "../prioritize/truth.js";
import { prioritize } from "../prioritize/run.js";
import { loadTruth, short } from "../ticket.js";
import { banner, table } from "../ui.js";
import { askOpus } from "./opus.js";
import { logUsage, STEPS } from "../ledger.js";

const ticketId = process.argv[2] ?? "PDP-142";
const jev = await prioritize(ticketId);
const opus = askOpus(ticketId);
const opusCriteria = evaluate(loadTruth(ticketId), { order: opus.order, excluded: opus.excluded });

banner(`Opus contra Jev · priorizar ${ticketId}`, jev.simulated || opus.simulated);
const ok = (c: { passed: boolean }[]) => `${c.filter((x) => x.passed).length} de ${c.length}`;
table(
  ["", "Jev + rank.ts", "Opus (claude -p)"],
  [
    ["Costo (precio de lista)", usd(jev.costUsd), usd(opus.costList)],
    ["Costo que reporta Claude Code", "—", usd(opus.costReported)],
    ["Tiempo de respuesta", `${(jev.ms / 1000).toFixed(2)} s`, `${(opus.ms / 1000).toFixed(2)} s`],
    ["Tokens de entrada", String(jev.inputTokens), String(opus.usage.input_tokens ?? "sin dato")],
    ["Tokens de salida", "0 (gratis)", String(opus.usage.output_tokens ?? "sin dato")],
    ["Criterios de éxito", ok(jev.criteria), ok(opusCriteria)],
    ["Top 3", jev.plan.order.slice(0, 3).map((r) => short(r.id)).join(" "), opus.order.slice(0, 3).map(short).join(" ")],
    ["Motivo auditable", "sí, por regla", "prosa"],
  ],
);
console.log("\nCriterios:");
jev.criteria.forEach((c, i) => console.log(`  Jev ${c.passed ? "✓" : "✗"}  Opus ${opusCriteria[i]?.passed ? "✓" : "✗"}  ${c.description}`));
console.log(`\nModo ${mode()}. Con un solo ticket, la comparación es ilustrativa, no un benchmark.`);

const base = { ticket: ticketId, mode: mode() };
appendJsonl("metrics/compare-runs.jsonl", {
  ...base,
  jev: { costUsd: jev.costUsd, ms: jev.ms, inputTokens: jev.inputTokens, passed: jev.criteria.filter((c) => c.passed).length, simulated: jev.simulated },
  opus: { costUsd: opus.costList, costReported: opus.costReported, ms: opus.ms, usage: opus.usage, passed: opusCriteria.filter((c) => c.passed).length, simulated: opus.simulated },
  total: jev.criteria.length,
});

logUsage({
  step: STEPS.extra,
  label: `npm run compare -- ${ticketId} (Jev)`,
  engine: "jev",
  model: jev.snapshot || "jev",
  requests: jev.requests,
  inputTokens: jev.inputTokens,
  outputTokens: 0,
  costUsd: jev.costUsd,
  ms: jev.ms,
  mode: mode(),
  simulated: jev.simulated,
  result: `${jev.criteria.filter((c) => c.passed).length}/${jev.criteria.length} criterios`,
});
logUsage({
  step: STEPS.extra,
  label: `npm run compare -- ${ticketId} (Opus, prompt y parseo)`,
  engine: "claude",
  model: "opus",
  requests: 1,
  inputTokens: opus.usage.input_tokens ?? 0,
  outputTokens: opus.usage.output_tokens ?? 0,
  cacheReadTokens: opus.usage.cache_read_input_tokens ?? 0,
  cacheWriteTokens: opus.usage.cache_creation_input_tokens ?? 0,
  costUsd: opus.costList,
  ms: opus.ms,
  mode: mode(),
  simulated: opus.simulated,
  result: `${opusCriteria.filter((c) => c.passed).length}/${opusCriteria.length} criterios`,
});
