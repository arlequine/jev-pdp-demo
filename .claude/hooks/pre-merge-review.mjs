#!/usr/bin/env node
// PreToolUse (Bash): antes de un `git merge` o un `git push` a main, revisa con Jev.
// Si la revisión no APRUEBA, sale con código 2 y Claude Code no ejecuta el comando.
// El bloqueo no depende de que el agente coopere: lo aplica el harness.
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = process.env.CLAUDE_PROJECT_DIR || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

let input = "";
for await (const chunk of process.stdin) input += chunk;
let payload;
try {
  payload = JSON.parse(input || "{}");
} catch {
  process.exit(0);
}
if (payload.tool_name !== "Bash") process.exit(0);
const cmd = String(payload.tool_input?.command ?? "");

let range = null;
const merge = cmd.match(/\bgit\s+merge\s+(?:-\S+\s+)*([^\s;&|]+)/);
const push = cmd.match(/\bgit\s+push\b.*\bmain\b/);
if (merge) range = `HEAD..${merge[1]}`;
else if (push) range = "origin/main..HEAD";
if (!range) process.exit(0);

const r = spawnSync("npx", ["tsx", "packages/jev-flow/src/review/cli.ts", range], {
  cwd: root,
  encoding: "utf8",
  env: { ...process.env, FORCE_COLOR: "0", JEV_VIA: "hook" },
});
if (r.status === 0) process.exit(0);

const out = `${r.stdout ?? ""}${r.stderr ?? ""}`.replace(/\x1b\[[0-9;]*m/g, "");
const summary = out.split("\n").filter((l) => /BLOQUEAR|REVISAR|###|^- /.test(l)).slice(0, 12).join("\n");
process.stderr.write(
  `Merge bloqueado por la revisión de Jev (${range}).\n${summary}\n` +
    `La decisión de mergear es de una persona: revisa .jev/review-comment.md.\n`,
);
process.exit(2);
