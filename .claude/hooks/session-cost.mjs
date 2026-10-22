#!/usr/bin/env node
// Stop: suma los tokens de la sesión de Claude Code por modelo y los guarda en metrics/claude-code.jsonl.
// Así `npm run cost` puede mostrar cuánto costó el refactor con Sonnet y cuánto habría costado con Opus.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = process.env.CLAUDE_PROJECT_DIR || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PRICES = { sonnet: { input: 2, output: 10 }, opus: { input: 4, output: 20 } }; // = packages/jev-flow/src/prices.ts

let input = "";
for await (const chunk of process.stdin) input += chunk;
const { transcript_path, session_id } = JSON.parse(input || "{}");
if (!transcript_path || !fs.existsSync(transcript_path)) process.exit(0);

const totals = {};
for (const line of fs.readFileSync(transcript_path, "utf8").split("\n")) {
  if (!line.trim()) continue;
  let e;
  try {
    e = JSON.parse(line);
  } catch {
    continue;
  }
  const u = e.message?.usage;
  const model = e.message?.model;
  if (!u || !model) continue;
  const t = (totals[model] ??= { input: 0, output: 0, cacheWrite: 0, cacheRead: 0 });
  t.input += u.input_tokens ?? 0;
  t.output += u.output_tokens ?? 0;
  t.cacheWrite += u.cache_creation_input_tokens ?? 0;
  t.cacheRead += u.cache_read_input_tokens ?? 0;
}

const cost = (p, t) => (t.input * p.input + t.cacheWrite * p.input * 1.25 + t.cacheRead * p.input * 0.1 + t.output * p.output) / 1e6;
let branch = "";
try {
  branch = fs.readFileSync(path.join(root, ".git/HEAD"), "utf8").trim().replace("ref: refs/heads/", "");
} catch {}

for (const [model, t] of Object.entries(totals)) {
  const family = model.includes("opus") ? "opus" : model.includes("sonnet") ? "sonnet" : null;
  if (!family) continue;
  const row = {
    at: new Date().toISOString(),
    sessionId: session_id,
    label: branch.includes("refactor") ? "refactor" : branch,
    model: family,
    tokens: t,
    costUsd: cost(PRICES[family], t),
    costIfOpus: cost(PRICES.opus, t),
  };
  fs.mkdirSync(path.join(root, "metrics"), { recursive: true });
  fs.appendFileSync(path.join(root, "metrics/claude-code.jsonl"), JSON.stringify(row) + "\n");
}
