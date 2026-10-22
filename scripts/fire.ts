// npm run fire [-- --only F1,F3] [--headless]
// Corre la prueba de fuego. En la demo, con navegador visible; en CI, sin ventana.
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const onlyArg = args.find((a) => a.startsWith("--only"));
const only = onlyArg?.includes("=") ? onlyArg.split("=")[1] : onlyArg ? args[args.indexOf(onlyArg) + 1] : undefined;
const headless = args.includes("--headless") || !!process.env.CI;

const pw = ["playwright", "test", "e2e/fire.spec.ts", "--workers=1"];
if (only) pw.push("--grep", only.split(",").map((c) => `^${c.trim()} `).join("|"));
if (!headless) pw.push("--headed");

const r = spawnSync("npx", pw, { stdio: "inherit", env: { ...process.env, FIRE_LOG: "1" } });
console.log(r.status === 0 ? "\n\x1b[32m\x1b[1mPrueba de fuego en verde.\x1b[0m" : "\n\x1b[31m\x1b[1mPrueba de fuego en rojo.\x1b[0m");
process.exit(r.status ?? 1);
