// npm run fire [-- --only F1,F3] [--headless]
// Corre la prueba de fuego. En la demo, con navegador visible; en CI, sin ventana.
// Queda en el registro de la demo con costo $0: lo determinista no gasta tokens.
import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import { logUsage, STEPS } from "../packages/jev-flow/src/ledger.js";

const args = process.argv.slice(2);
const onlyArg = args.find((a) => a.startsWith("--only"));
const only = onlyArg?.includes("=") ? onlyArg.split("=")[1] : onlyArg ? args[args.indexOf(onlyArg) + 1] : undefined;
const headless = args.includes("--headless") || !!process.env.CI;

const pw = ["playwright", "test", "e2e/fire.spec.ts", "--workers=1"];
if (only) pw.push("--grep", only.split(",").map((c) => `${c.trim()} ·`).join("|"));
if (!headless) pw.push("--headed");

const before = fs.existsSync("metrics/fire-runs.jsonl") ? fs.readFileSync("metrics/fire-runs.jsonl", "utf8").split("\n").filter(Boolean).length : 0;
const started = Date.now();
const r = spawnSync("npx", pw, { stdio: "inherit", env: { ...process.env, FIRE_LOG: "1" } });
console.log(r.status === 0 ? "\n\x1b[32m\x1b[1mPrueba de fuego en verde.\x1b[0m" : "\n\x1b[31m\x1b[1mPrueba de fuego en rojo.\x1b[0m");

let result = r.status === 0 ? "en verde" : "en rojo";
try {
  const runs = fs.readFileSync("metrics/fire-runs.jsonl", "utf8").split("\n").filter(Boolean);
  if (runs.length > before) {
    const last = JSON.parse(runs[runs.length - 1]);
    const ok = last.checks.filter((c: any) => c.ok).length;
    result = `${ok}/${last.checks.length} checks en verde · precio ${last.priceSeen || "—"}`;
  }
} catch {}
let branch = "";
try {
  branch = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf8" }).trim();
} catch {}
logUsage({
  step: branch === "main" ? STEPS.ticket : branch === "refactor/pdp" ? STEPS.refactor : STEPS.results,
  label: `npm run fire${only ? ` -- --only ${only}` : ""}`,
  engine: "local",
  model: "playwright",
  inputTokens: 0,
  outputTokens: 0,
  costUsd: 0,
  ms: Date.now() - started,
  result: `${result} · rama ${branch}`,
});
process.exit(r.status ?? 1);
