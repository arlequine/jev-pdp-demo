// Lo que NO se le pregunta a Jev: lo comprueba el código. Si falla, se bloquea sin gastar un token.
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { git, treeOf, type Unit } from "../git.js";
import { at, ROOT } from "../paths.js";

export type Check = { name: string; ok: boolean; detail?: string };

const SECRET = /(sk-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:TYPESAFE|JEV)_API_KEY\s*=\s*['"]?\w{8,})/;

export function secrets(units: Unit[]): Check {
  for (const u of units) {
    const hit = u.diff.split("\n").find((l) => l.startsWith("+") && SECRET.test(l));
    if (hit) return { name: "secretos", ok: false, detail: `${u.file}: posible secreto en el diff` };
  }
  return { name: "secretos", ok: true };
}

/** typecheck del árbol de la rama en un worktree temporal, cacheado por hash de árbol. */
export function typecheck(head: string): Check {
  const tree = treeOf(head);
  const cacheFile = at(".jev/cache", `typecheck-${tree}.json`);
  if (fs.existsSync(cacheFile)) return JSON.parse(fs.readFileSync(cacheFile, "utf8"));
  const dir = at(".jev/cache", `wt-${tree.slice(0, 12)}`);
  let result: Check;
  try {
    if (!fs.existsSync(dir)) git("worktree", "add", "--detach", dir, head);
    if (!fs.existsSync(path.join(dir, "node_modules"))) fs.symlinkSync(path.join(ROOT, "node_modules"), path.join(dir, "node_modules"));
    execSync("npx tsc -p apps/api && npx tsc -p apps/web && npx tsc -p packages/jev-flow", { cwd: dir, stdio: "pipe" });
    result = { name: "typecheck", ok: true };
  } catch (e: any) {
    const out = String(e.stdout ?? e.message).split("\n").slice(0, 5).join("\n");
    result = { name: "typecheck", ok: false, detail: out };
  } finally {
    try {
      git("worktree", "remove", "--force", dir);
    } catch {}
  }
  fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
  fs.writeFileSync(cacheFile, JSON.stringify(result));
  return result;
}
