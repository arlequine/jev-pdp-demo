import { mode } from "../jev/client.js";
import { appendJsonl } from "../paths.js";
import { usd } from "../prices.js";
import { short } from "../ticket.js";
import { prioritize, savePlan } from "./run.js";
import { table, banner } from "../ui.js";
import { logUsage, STEPS } from "../ledger.js";

const ticketId = process.argv[2] ?? "PDP-142";
const r = await prioritize(ticketId);

banner(`Priorización de ${ticketId} · Jev puntúa, rank.ts ordena`, r.simulated);
table(
  ["#", "Subtarea", "Impacto", "Urgencia", "Complej.", "Prioridad", "Motivo"],
  [
    ...r.plan.order.map((x, i) => [
      String(i + 1),
      `${short(x.id)} ${x.title}`.slice(0, 44),
      String(x.impact),
      String(x.urgency),
      String(x.complexity),
      x.priority.toFixed(2),
      (x.needsPm.length ? "⚑ Necesita PM · " : "") + x.reasons.join(" · "),
    ]),
    ...r.plan.excluded.map((e) => ["—", `${short(e.id)} ${e.title}`.slice(0, 44), "", "", "", "excluida", e.reason]),
  ],
);

if (r.criteria.length) {
  const ok = r.criteria.filter((c) => c.passed).length;
  console.log(`\nCriterios de éxito: ${ok} de ${r.criteria.length}`);
  for (const c of r.criteria) console.log(`  ${c.passed ? "✓" : "✗"} ${c.description}`);
}
console.log(
  `\n${r.requests} requests · ${r.inputTokens} tokens de entrada · salida gratis · ${usd(r.costUsd)} · ${r.ms} ms · modo ${mode()}`,
);

savePlan(r);
console.log("Plan escrito en .jev/plan.json");

appendJsonl("metrics/prioritize-runs.jsonl", {
  method: "jev",
  ticket: ticketId,
  ms: r.ms,
  inputTokens: r.inputTokens,
  costUsd: r.costUsd,
  passed: r.criteria.filter((c) => c.passed).length,
  total: r.criteria.length,
  simulated: r.simulated,
  mode: mode(),
});

logUsage({
  step: STEPS.prioritize,
  label: `npm run prioritize -- ${ticketId}`,
  engine: "jev",
  model: r.snapshot || "jev",
  requests: r.requests,
  inputTokens: r.inputTokens,
  outputTokens: 0,
  costUsd: r.costUsd,
  ms: r.ms,
  mode: mode(),
  simulated: r.simulated,
  result: `${r.criteria.filter((c) => c.passed).length}/${r.criteria.length} criterios · primero ${short(r.plan.order[0]?.id ?? "")}`,
});
