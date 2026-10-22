import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { at, loadEnv } from "../paths.js";
import { jevCost } from "../prices.js";
import { simulate } from "./simulator.js";
import type { JevRequest, JevResponse, JevResult, Questions } from "./types.js";

loadEnv();

// JEV_MODE:
//   live     llama a la API nativa de Jev
//   record   llama y guarda la respuesta en recordings/jev/
//   replay   solo lee grabaciones (la demo corre sin red)
//   simulate genera respuestas de ejemplo y las guarda marcadas como simuladas
export type Mode = "live" | "record" | "replay" | "simulate";
export const mode = (): Mode => (process.env.JEV_MODE as Mode) || "replay";
export const model = () => process.env.JEV_MODEL || "jev-1.13";

const DIR = at("recordings/jev");

export function requestKey(req: JevRequest) {
  return createHash("sha256").update(JSON.stringify(req)).digest("hex").slice(0, 16);
}

function recordingPath(key: string) {
  return path.join(DIR, `${key}.json`);
}

/** Un request = un state + N preguntas. Todas se evalúan en paralelo sobre el mismo state. */
export async function askJev(state: unknown, questions: Questions, label: string): Promise<JevResult> {
  const req: JevRequest = { model: model(), state, questions };
  const key = requestKey(req);
  const m = mode();

  if (m === "replay") {
    const file = recordingPath(key);
    if (!fs.existsSync(file)) {
      throw new Error(
        `No hay grabación para «${label}» (${key}). El repo no está como en el ensayo: ` +
          `corre npm run demo:reset, o graba con JEV_MODE=record.`,
      );
    }
    const rec = JSON.parse(fs.readFileSync(file, "utf8"));
    return { ...rec.response, durationMs: rec.durationMs, source: "replay", simulated: !!rec.simulated, costUsd: jevCost(rec.response.usage.input_tokens) };
  }

  const started = performance.now();
  const response = m === "simulate" ? simulate(req, label) : await callApi(req);
  const durationMs = Math.round(m === "simulate" ? 90 + Math.random() * 120 : performance.now() - started);

  if (m === "record" || m === "simulate") {
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(
      recordingPath(key),
      JSON.stringify({ label, simulated: m === "simulate", recordedAt: new Date().toISOString(), durationMs, request: req, response }, null, 2),
    );
  }
  return { ...response, durationMs, source: "live", simulated: m === "simulate", costUsd: jevCost(response.usage.input_tokens) };
}

async function callApi(req: JevRequest): Promise<JevResponse> {
  const key = process.env.JEV_API_KEY;
  if (!key) throw new Error("Falta JEV_API_KEY en .env (o usa JEV_MODE=replay).");
  // SUPUESTO: la API nativa expone POST {base}/v1/systemone, igual que el SDK de TypeSafe.
  const base = (process.env.JEV_BASE_URL || "https://api.typesafe.ai").replace(/\/$/, "");
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${base}/v1/systemone`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    if (res.status === 429) {
      const wait = Number(res.headers.get("retry-after") ?? 1) * 1000;
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    if (!res.ok) throw new Error(`Jev respondió ${res.status}: ${await res.text()}`);
    const body = (await res.json()) as JevResponse;
    if (body.model && !body.model.startsWith(req.model)) {
      console.warn(`\x1b[33m⚠ Respondió el snapshot ${body.model}; los umbrales están calibrados contra ${req.model}.\x1b[0m`);
    }
    return body;
  }
  throw new Error("Jev siguió respondiendo 429 después de 3 intentos.");
}
