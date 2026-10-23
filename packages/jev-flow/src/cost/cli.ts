// npm run cost — el mismo resumen del dashboard, en la terminal. Lee metrics/ledger.jsonl.
//   npm run cost -- --all   todas las sesiones
import { readLedger } from "../ledger.js";
import { usd } from "../prices.js";
import { banner, table } from "../ui.js";

const all = process.argv.includes("--all");
const { session, entries } = readLedger({ all });
const sum = (f: (e: (typeof entries)[number]) => number, xs = entries) => xs.reduce((n, e) => n + (f(e) || 0), 0);

banner(`Costo de la demo · ${all ? "todas las sesiones" : `sesión ${session.id}`}`, entries.some((e) => e.simulated));
if (!entries.length) {
  console.log("Sin registros todavía. Corre un comando de la demo (o npm run cost -- --all).");
  process.exit(0);
}
table(
  ["Hora", "Paso", "Qué", "Motor", "Tokens", "Costo"],
  entries.map((e) => [
    new Date(e.at).toLocaleTimeString("es-MX"),
    e.step,
    e.label.slice(0, 56),
    `${e.engine}${e.engine !== "local" ? ` · ${e.model}` : ""}`,
    String(e.inputTokens + e.outputTokens + (e.cacheReadTokens ?? 0) + (e.cacheWriteTokens ?? 0)),
    usd(e.costUsd),
  ]),
);
const jev = entries.filter((e) => e.engine === "jev");
const claude = entries.filter((e) => e.engine === "claude");
console.log(`\nTotal ${usd(sum((e) => e.costUsd))} · Jev ${usd(sum((e) => e.costUsd, jev))} (${jev.length}) · Claude ${usd(sum((e) => e.costUsd, claude))} (${claude.length})`);
console.log("Dashboard: npm run dashboard → http://localhost:4400");
