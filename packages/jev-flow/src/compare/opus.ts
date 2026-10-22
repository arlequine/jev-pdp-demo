// La alternativa: «prompt y parseo» con Opus en Claude Code (claude -p).
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { mode } from "../jev/client.js";
import { at } from "../paths.js";
import { claudeCost, type ClaudeUsage } from "../prices.js";

export type OpusResult = {
  order: string[];
  excluded: string[];
  ms: number;
  usage: ClaudeUsage;
  costList: number; // tokens × precio de lista (comparable con Jev)
  costReported?: number; // total_cost_usd que reporta Claude Code
  simulated: boolean;
  raw: string;
};

export function opusPrompt(ticketId: string) {
  const md = fs.readFileSync(at("tickets", `${ticketId}.md`), "utf8");
  const json = fs.readFileSync(at("tickets", `${ticketId}.json`), "utf8");
  return [
    "Eres el tech lead del equipo. Ordena las subtareas de este ticket por impacto, urgencia y complejidad.",
    "Excluye lo que esté fuera del alcance de la página de detalle de producto.",
    'Responde SOLO con JSON: {"order": ["PDP-142.x", ...], "excluded": ["PDP-142.y", ...], "why": "..."}',
    "",
    md,
    "",
    "Datos completos:",
    json,
  ].join("\n");
}

export function askOpus(ticketId: string): OpusResult {
  const file = at("recordings/claude-code", `compare-opus-${ticketId}.json`);
  const m = mode();
  let rec: any;

  if (m === "replay") {
    if (!fs.existsSync(file)) throw new Error(`No hay grabación de Opus para ${ticketId}. Corre con JEV_MODE=record (necesitas claude en el PATH).`);
    rec = JSON.parse(fs.readFileSync(file, "utf8"));
  } else if (m === "simulate") {
    rec = simulatedOpus();
  } else {
    const out = spawnSync("claude", ["-p", opusPrompt(ticketId), "--model", "opus", "--output-format", "json"], {
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
    });
    if (out.status !== 0) throw new Error(`claude -p falló: ${out.stderr || out.error}`);
    rec = { simulated: false, ...JSON.parse(out.stdout) };
  }
  if (m === "record" || m === "simulate") {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify({ recordedAt: new Date().toISOString(), ...rec }, null, 2));
  }

  const text: string = rec.result ?? "";
  const parsed = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1) || "{}");
  const usage: ClaudeUsage = rec.usage ?? {};
  return {
    order: parsed.order ?? [],
    excluded: parsed.excluded ?? [],
    ms: rec.duration_ms ?? 0,
    usage,
    costList: claudeCost("opus", usage),
    costReported: rec.total_cost_usd,
    simulated: !!rec.simulated,
    raw: text,
  };
}

// SOLO PARA GRABACIONES DE EJEMPLO. Reemplázala corriendo JEV_MODE=record npm run compare -- PDP-142.
function simulatedOpus() {
  const usage = { input_tokens: 3100, output_tokens: 980, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 };
  return {
    simulated: true,
    duration_ms: 14200,
    usage,
    total_cost_usd: claudeCost("opus", usage),
    result: JSON.stringify({
      order: ["PDP-142.4", "PDP-142.6", "PDP-142.5", "PDP-142.3", "PDP-142.9", "PDP-142.7", "PDP-142.2", "PDP-142.8", "PDP-142.1", "PDP-142.10"],
      excluded: [],
      why: "Ejemplo simulado: el precio y el botón primero; el banner urgente y la nota del CTO suben por la presión del ticket.",
    }),
  };
}
