// Resumen de costos para la diapositiva de resultados. Lee metrics/*.jsonl.
import fs from "node:fs";
import { at, readJsonl } from "../paths.js";
import { usd } from "../prices.js";
import { banner, table } from "../ui.js";

const filter = process.argv[2]; // p. ej. «refactor» para ver solo la sesión de Claude Code
const last = <T>(xs: T[]) => xs[xs.length - 1];
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined);

const config = fs.existsSync(at("metrics/config.json")) ? JSON.parse(fs.readFileSync(at("metrics/config.json"), "utf8")) : {};
const prsPerMonth: number = config.prsPerMonth ?? 400;

const compare = last(readJsonl("metrics/compare-runs.jsonl"));
const reviews = readJsonl("metrics/review-runs.jsonl").filter((r) => r.units > 0);
const sessions = readJsonl("metrics/claude-code.jsonl");
const perPR = avg(reviews.map((r) => r.costUsd));

const sessionRows = sessions
  .filter((s) => !filter || (s.label ?? "").includes(filter) || filter === "refactor")
  .slice(-3)
  .map((s) => [`Claude Code · ${s.label ?? s.sessionId?.slice(0, 8)}`, "—", `${s.model} ${usd(s.costUsd)} · con Opus ${usd(s.costIfOpus)}`]);

banner("Cuánto costó cada decisión", !!(compare?.jev?.simulated || reviews.some((r) => r.simulated)));
table(
  ["Paso", "Con Jev", "Alternativa"],
  [
    [
      "Priorizar el ticket",
      compare ? `${usd(compare.jev.costUsd)} · ${(compare.jev.ms / 1000).toFixed(2)} s · ${compare.jev.passed}/${compare.total}` : "sin dato",
      compare ? `Opus ${usd(compare.opus.costUsd)} · ${(compare.opus.ms / 1000).toFixed(2)} s · ${compare.opus.passed}/${compare.total}` : "sin dato",
    ],
    ...(sessionRows.length ? sessionRows : [["Refactor (Claude Code)", "—", "sin dato: corre una sesión con el hook Stop activo"]]),
    ["Revisar un PR", perPR != null ? usd(perPR) : "sin dato", "—"],
    [`${prsPerMonth} PRs al mes (proyección)`, perPR != null ? usd(perPR * prsPerMonth) : "sin dato", "—"],
  ],
);
console.log(`\nFuentes: metrics/compare-runs.jsonl, metrics/review-runs.jsonl, metrics/claude-code.jsonl. PRs al mes: metrics/config.json.`);
