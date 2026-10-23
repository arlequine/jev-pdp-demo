// npm run jev:models — prueba tu TYPESAFE_API_KEY y confirma que jev-1.13 está disponible.
// GET {TYPESAFE_BASE_URL}/v1/models (docs.typesafe.ai/api/list-models). No gasta tokens.
import { apiConfig, model } from "../packages/jev-flow/src/jev/client.js";

let cfg: { key: string; base: string };
try {
  cfg = apiConfig();
} catch (e) {
  console.error(`✗ ${(e as Error).message}`);
  process.exit(1);
}
const { key, base } = cfg;
const res = await fetch(`${base}/v1/models`, { headers: { Authorization: `Bearer ${key}` } });
if (!res.ok) {
  console.error(`✗ ${res.status} ${res.statusText}: ${await res.text()}`);
  process.exit(1);
}
const body: any = await res.json();
const text = JSON.stringify(body);
console.log(`✓ La key funciona contra ${base}`);
console.log(text.includes(model()) ? `✓ ${model()} está disponible` : `⚠ No veo ${model()} en la lista; revisa los alias:`);
console.log(JSON.stringify(body, null, 2).slice(0, 2000));
