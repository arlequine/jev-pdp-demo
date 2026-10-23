#!/usr/bin/env node
// Stop: al terminar cada respuesta de Claude Code, registra lo que costó ESE prompt en metrics/ledger.jsonl.
// Suma los tokens del transcript por modelo, resta lo ya registrado en esta sesión y guarda la diferencia.
// Así el dashboard (npm run dashboard) muestra el costo de cada prompt de la demo.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = process.env.CLAUDE_PROJECT_DIR || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PRICES = { sonnet: { input: 2, output: 10 }, opus: { input: 4, output: 20 }, haiku: { input: 1, output: 5 } }; // = packages/jev-flow/src/prices.ts
const STEP = "3 · Refactor con Sonnet";

let input = "";
for await (const chunk of process.stdin) input += chunk;
const { transcript_path, session_id } = JSON.parse(input || "{}");
if (!transcript_path || !fs.existsSync(transcript_path)) process.exit(0);

const totals = {};
let lastPrompt = "";
const seen = new Set();
for (const line of fs.readFileSync(transcript_path, "utf8").split("\n")) {
  if (!line.trim()) continue;
  let e;
  try {
    e = JSON.parse(line);
  } catch {
    continue;
  }
  if (e.type === "user" && e.message?.role === "user") {
    const c = e.message.content;
    const text = typeof c === "string" ? c : Array.isArray(c) ? c.filter((p) => p.type === "text").map((p) => p.text).join(" ") : "";
    if (text.trim() && !text.startsWith("<")) lastPrompt = text.trim();
  }
  const u = e.message?.usage;
  const model = e.message?.model;
  if (!u || !model) continue;
  // Un mensaje puede aparecer en varias líneas (streaming): cuenta cada id una vez.
  const id = e.message.id ?? e.uuid;
  if (id && seen.has(id)) continue;
  if (id) seen.add(id);
  const t = (totals[model] ??= { input: 0, output: 0, cacheWrite: 0, cacheRead: 0 });
  t.input += u.input_tokens ?? 0;
  t.output += u.output_tokens ?? 0;
  t.cacheWrite += u.cache_creation_input_tokens ?? 0;
  t.cacheRead += u.cache_read_input_tokens ?? 0;
}

const cost = (p, t) => (t.input * p.input + t.cacheWrite * p.input * 1.25 + t.cacheRead * p.input * 0.1 + t.output * p.output) / 1e6;
const family = (m) => (m.includes("opus") ? "opus" : m.includes("sonnet") ? "sonnet" : m.includes("haiku") ? "haiku" : null);

// Lo ya registrado de esta sesión de Claude Code, para guardar solo la diferencia de este prompt.
const stateFile = path.join(root, ".jev/cache/claude-sessions.json");
let state = {};
try {
  state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
} catch {}
const prev = state[session_id] ?? {};

let demoSession = "sin-sesion";
try {
  demoSession = JSON.parse(fs.readFileSync(path.join(root, ".jev/session.json"), "utf8")).id;
} catch {}

for (const [model, t] of Object.entries(totals)) {
  const fam = family(model);
  if (!fam) continue;
  const p = prev[model] ?? { input: 0, output: 0, cacheWrite: 0, cacheRead: 0 };
  const d = { input: t.input - p.input, output: t.output - p.output, cacheWrite: t.cacheWrite - p.cacheWrite, cacheRead: t.cacheRead - p.cacheRead };
  if (d.input + d.output + d.cacheWrite + d.cacheRead <= 0) continue;
  const row = {
    at: new Date().toISOString(),
    session: demoSession,
    step: STEP,
    label: lastPrompt ? `Prompt: ${lastPrompt.replace(/\s+/g, " ").slice(0, 90)}` : "Prompt de Claude Code",
    via: "claude-code",
    engine: "claude",
    model: fam,
    requests: 1,
    inputTokens: d.input,
    outputTokens: d.output,
    cacheReadTokens: d.cacheRead,
    cacheWriteTokens: d.cacheWrite,
    costUsd: cost(PRICES[fam], d),
    costIfOpusUsd: cost(PRICES.opus, d),
    mode: "live",
    result: `sesión ${String(session_id).slice(0, 8)}`,
  };
  fs.mkdirSync(path.join(root, "metrics"), { recursive: true });
  fs.appendFileSync(path.join(root, "metrics/ledger.jsonl"), JSON.stringify(row) + "\n");
}
state[session_id] = totals;
fs.mkdirSync(path.dirname(stateFile), { recursive: true });
fs.writeFileSync(stateFile, JSON.stringify(state));
