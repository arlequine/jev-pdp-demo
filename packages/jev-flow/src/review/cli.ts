import fs from "node:fs";
import { mode } from "../jev/client.js";
import { appendJsonl, at } from "../paths.js";
import { usd } from "../prices.js";
import { banner, table, VERDICT_COLOR } from "../ui.js";
import { logUsage, STEPS } from "../ledger.js";
import { humanComment, review, saveReviewReport } from "./review.js";

const args = process.argv.slice(2);
const range = args.find((a) => !a.startsWith("--")) ?? "main..HEAD";
const r = await review(range, { typecheck: !args.includes("--no-typecheck") });

banner(`Revisión de ${range} · deterministas primero, luego Jev, al final los umbrales`, r.simulated);
for (const c of r.checks) console.log(`${c.ok ? "✓" : "✗"} ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
console.log();

if (r.units.length) {
  table(
    ["Veredicto", "Archivo", "Commit", "Motivo"],
    r.units.map((u) => [u.verdict, u.file.replace(/^apps\//, ""), u.subject.slice(0, 48), u.reasons.join("; ") || "—"]),
  );
}

const color = VERDICT_COLOR[r.verdict];
console.log(`\n${color}\x1b[1m${r.verdict}\x1b[0m  ·  ${r.requests} requests · ${r.inputTokens} tokens de entrada · ${usd(r.costUsd)} · ${r.ms} ms · modo ${mode()}`);

const comment = humanComment(r);
if (comment) {
  fs.mkdirSync(at(".jev"), { recursive: true });
  fs.writeFileSync(at(".jev/review-comment.md"), comment + "\n");
  console.log("\n" + comment);
} else {
  console.log("Todo en orden: no hace falta comentario.");
}

appendJsonl("metrics/review-runs.jsonl", {
  range,
  verdict: r.verdict,
  units: r.units.length,
  requests: r.requests,
  inputTokens: r.inputTokens,
  costUsd: r.costUsd,
  ms: r.ms,
  simulated: r.simulated,
  snapshot: r.snapshot,
  mode: mode(),
});

const report = saveReviewReport(r, process.env.JEV_VIA ?? "cli");
console.log(`Reporte completo: ${report}`);
logUsage({
  step: STEPS.review,
  label: `npm run review -- ${range}`,
  engine: "jev",
  model: r.snapshot || "jev",
  requests: r.requests,
  inputTokens: r.inputTokens,
  outputTokens: 0,
  costUsd: r.costUsd,
  ms: r.ms,
  mode: mode(),
  simulated: r.simulated,
  result: `${r.verdict} · ${r.units.length} archivos`,
});

process.exit(r.verdict === "APROBAR" ? 0 : r.verdict === "REVISAR" ? 1 : 2);
