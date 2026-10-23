// Registro único de consumo de la demo: una línea por comando o por prompt, con su costo.
// Lo escriben los CLIs, el servidor MCP, la prueba de fuego y el hook Stop de Claude Code (un registro por prompt).
// Lo lee el dashboard (npm run dashboard) y npm run cost. Formato: metrics/ledger.jsonl (no va a git).
import fs from "node:fs";
import path from "node:path";
import { at } from "./paths.js";

export const STEPS = {
  ticket: "1 · Ticket",
  prioritize: "2 · Priorizar",
  refactor: "3 · Refactor con Sonnet",
  review: "4 · Revisión del PR",
  results: "5 · Resultados",
  extra: "Extra",
} as const;

export type Engine = "jev" | "claude" | "local";
export type LedgerEntry = {
  at: string;
  session: string;
  step: string;
  label: string; // el comando o el prompt, tal como se ve en la demo
  via: string; // cli · mcp · hook · claude-code
  engine: Engine;
  model: string;
  requests?: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  costUsd: number;
  costIfOpusUsd?: number; // misma carga a precio de Opus (solo Claude)
  ms?: number;
  mode?: string; // live · replay · simulate · auto
  simulated?: boolean;
  result?: string; // veredicto, criterios, checks en verde…
};

const SESSION_FILE = () => at(".jev/session.json");
const LEDGER = "metrics/ledger.jsonl";

export type Session = { id: string; startedAt: string };

/** La sesión agrupa todo lo que pasa entre un `npm run demo:reset` y el siguiente. */
export function currentSession(): Session {
  const file = SESSION_FILE();
  if (fs.existsSync(file)) {
    try {
      return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {}
  }
  return newSession();
}

export function newSession(): Session {
  const startedAt = new Date().toISOString();
  const s = { id: startedAt.replace(/[-:T]/g, "").slice(0, 14), startedAt };
  fs.mkdirSync(path.dirname(SESSION_FILE()), { recursive: true });
  fs.writeFileSync(SESSION_FILE(), JSON.stringify(s, null, 2));
  return s;
}

export function logUsage(e: Omit<LedgerEntry, "at" | "session" | "via"> & { via?: string }) {
  const row: LedgerEntry = {
    at: new Date().toISOString(),
    session: currentSession().id,
    via: e.via ?? process.env.JEV_VIA ?? "cli",
    ...e,
  } as LedgerEntry;
  const file = at(LEDGER);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, JSON.stringify(row) + "\n");
}

export function readLedger(opts: { all?: boolean } = {}): { session: Session; entries: LedgerEntry[] } {
  const session = currentSession();
  const file = at(LEDGER);
  const rows: LedgerEntry[] = fs.existsSync(file)
    ? fs
        .readFileSync(file, "utf8")
        .split("\n")
        .filter(Boolean)
        .flatMap((l) => {
          try {
            return [JSON.parse(l)];
          } catch {
            return [];
          }
        })
    : [];
  return { session, entries: opts.all ? rows : rows.filter((r) => r.session === session.id) };
}
