import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { at, loadEnv } from "../paths.js";
import { jevCost } from "../prices.js";
import { simulate } from "./simulator.js";
import type { JevRequest, JevResponse, JevResult, Questions } from "./types.js";

loadEnv();

// JEV_MODE:
//   auto     (default) usa la grabación si existe; si no, llama a Jev y la guarda. Ideal para la demo:
//            lo ensayado sale de replay y lo nuevo (el commit que Sonnet hace en vivo) se pregunta en vivo.
//   live     llama a la API nativa de Jev
//   record   llama y guarda la respuesta en recordings/jev/
//   replay   solo lee grabaciones (la demo corre sin red)
//   simulate genera respuestas de ejemplo y las guarda marcadas como simuladas
export type Mode = "auto" | "live" | "record" | "replay" | "simulate";
export const mode = (): Mode => (process.env.JEV_MODE as Mode) || "auto";
const hasKey = () => !!(process.env.TYPESAFE_API_KEY || process.env.JEV_API_KEY);
// Alias por defecto: jev-latest (sigue a la versión más nueva). Para fijar una versión: JEV_MODEL=<nombre de /v1/models>.
export const model = () => process.env.JEV_MODEL || "jev-latest";
export const isAlias = (m: string) => /-(latest|preview)$/.test(m);

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

  const file = recordingPath(key);
  if (m === "replay" || (m === "auto" && fs.existsSync(file))) {
    if (!fs.existsSync(file)) {
      throw new Error(
        `No hay grabación para «${label}» (${key}). El repo no está como en el ensayo: ` +
          `corre npm run demo:reset, o graba con JEV_MODE=record.`,
      );
    }
    const rec = JSON.parse(fs.readFileSync(file, "utf8"));
    return { ...rec.response, durationMs: rec.durationMs, source: "replay", simulated: !!rec.simulated, costUsd: jevCost(rec.response.usage.input_tokens) };
  }

  if (m === "auto" && !hasKey()) {
    throw new Error(
      `No hay grabación para «${label}» y no hay TYPESAFE_API_KEY para preguntarle a Jev en vivo. ` +
        `Pon la key en .env, o usa una rama ensayada (refactor/pdp-recorded).`,
    );
  }
  const started = performance.now();
  const response = m === "simulate" ? simulate(req, label) : await callApi(req);
  const durationMs = Math.round(m === "simulate" ? 90 + Math.random() * 120 : performance.now() - started);

  if (m === "record" || m === "simulate" || m === "auto") {
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(
      recordingPath(key),
      JSON.stringify({ label, simulated: m === "simulate", recordedAt: new Date().toISOString(), durationMs, request: req, response }, null, 2),
    );
  }
  return { ...response, durationMs, source: "live", simulated: m === "simulate", costUsd: jevCost(response.usage.input_tokens) };
}

// Con un alias, el campo `model` de la respuesta dice qué snapshot contestó. Lo avisamos una vez por proceso
// y queda en metrics/*.jsonl: si cambia, revisa umbrales y regraba los replays.
let lastSnapshot = "";
function noteSnapshot(requested: string, answered?: string) {
  if (!answered || answered === lastSnapshot) return;
  lastSnapshot = answered;
  if (isAlias(requested)) {
    console.error(`\x1b[36mℹ ${requested} respondió con el snapshot ${answered}.\x1b[0m`);
  } else if (!answered.startsWith(requested)) {
    console.error(`\x1b[33m⚠ Pediste ${requested} y respondió ${answered}; los umbrales se calibraron con ${requested}.\x1b[0m`);
  }
}

/** Mismas variables que los SDKs de TypeSafe (TYPESAFE_API_KEY, TYPESAFE_BASE_URL). JEV_* queda por compatibilidad. */
export function apiConfig() {
  const key = process.env.TYPESAFE_API_KEY || process.env.JEV_API_KEY;
  if (!key) throw new Error("Falta TYPESAFE_API_KEY en .env (o usa JEV_MODE=replay). Créala en https://console.typesafe.ai/keys");
  const base = (process.env.TYPESAFE_BASE_URL || process.env.JEV_BASE_URL || "https://api.typesafe.ai").replace(/\/$/, "");
  return { key, base };
}

// POST {base}/v1/systemone · Authorization: Bearer · body { model, state, questions }
// Respuesta { model, answers, usage: { input_tokens, output_tokens } }. Ver docs.typesafe.ai/api/system-one
async function callApi(req: JevRequest): Promise<JevResponse> {
  const { key, base } = apiConfig();
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
    if (!res.ok) {
      const detail = await res.text();
      const hint = res.status === 400 ? ` Revisa el modelo «${req.model}» con npm run jev:models (o cambia JEV_MODEL).` : "";
      throw new Error(`Jev respondió ${res.status}: ${detail}.${hint}`);
    }
    const body = (await res.json()) as JevResponse;
    noteSnapshot(req.model, body.model);
    return body;
  }
  throw new Error("Jev siguió respondiendo 429 después de 3 intentos.");
}
