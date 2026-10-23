// Regenera las grabaciones de EJEMPLO (simuladas) para que la demo corra en replay sin API key.
// Para grabar respuestas reales: JEV_MODE=record con TYPESAFE_API_KEY en .env y corre los mismos comandos.
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const dir = "recordings/jev";
if (fs.existsSync(dir)) {
  for (const f of fs.readdirSync(dir)) {
    const rec = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    if (rec.simulated) fs.unlinkSync(path.join(dir, f));
  }
}

const run = (cmd: string) => {
  console.log(`\n$ ${cmd}`);
  try {
    execSync(cmd, { stdio: "inherit", env: { ...process.env, JEV_MODE: "simulate" } });
  } catch {
    // review sale con 1 o 2 cuando no aprueba: es esperado
  }
};

run("npx tsx packages/jev-flow/src/prioritize/cli.ts PDP-142");
run("npx tsx packages/jev-flow/src/compare/cli.ts PDP-142");
run("npx tsx packages/jev-flow/src/rules-compare/cli.ts");
run("npx tsx packages/jev-flow/src/review/cli.ts main..refactor/pdp-recorded");
run("npx tsx packages/jev-flow/src/review/cli.ts main..refactor/pdp-trap");
console.log("\nGrabaciones simuladas listas en recordings/. Todas llevan \"simulated\": true.");
