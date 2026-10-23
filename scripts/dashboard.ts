// npm run dashboard — el costo de la demo, comando por comando y prompt por prompt.
// Lee metrics/ledger.jsonl y sirve un dashboard en http://localhost:4400 que se actualiza solo.
//   ?all=1   incluye todas las sesiones (por defecto, solo la sesión desde el último npm run demo:reset)
import http from "node:http";
import { readLedger, type LedgerEntry } from "../packages/jev-flow/src/ledger.js";

const PORT = Number(process.env.DASHBOARD_PORT ?? 4400);
const STEP_ORDER = ["1 · Ticket", "2 · Priorizar", "3 · Refactor con Sonnet", "4 · Revisión del PR", "5 · Resultados", "Extra"];

function summarize(all: boolean) {
  const { session, entries } = readLedger({ all });
  const everything = readLedger({ all: true }).entries;
  const sum = (xs: LedgerEntry[], f: (e: LedgerEntry) => number) => xs.reduce((n, e) => n + (f(e) || 0), 0);
  const by = (engine: string) => entries.filter((e) => e.engine === engine);
  const jev = by("jev");
  const claude = by("claude");
  const local = by("local");
  const steps = STEP_ORDER.map((step) => {
    const xs = entries.filter((e) => e.step === step);
    return { step, jev: sum(xs.filter((e) => e.engine === "jev"), (e) => e.costUsd), claude: sum(xs.filter((e) => e.engine === "claude"), (e) => e.costUsd), count: xs.length };
  }).filter((s) => s.count > 0);
  const lastCompare = [...everything].reverse().find((e) => e.label.includes("compare") && e.engine === "claude");
  const lastCompareJev = [...everything].reverse().find((e) => e.label.includes("compare") && e.engine === "jev");
  return {
    session,
    all,
    generatedAt: new Date().toISOString(),
    totals: {
      cost: sum(entries, (e) => e.costUsd),
      jev: { cost: sum(jev, (e) => e.costUsd), requests: sum(jev, (e) => e.requests ?? 0), tokens: sum(jev, (e) => e.inputTokens), runs: jev.length },
      claude: {
        cost: sum(claude, (e) => e.costUsd),
        costIfOpus: sum(claude.filter((e) => e.model !== "opus"), (e) => e.costIfOpusUsd ?? 0),
        prompts: claude.filter((e) => e.via === "claude-code").length,
        tokens: sum(claude, (e) => e.inputTokens + e.outputTokens + (e.cacheReadTokens ?? 0) + (e.cacheWriteTokens ?? 0)),
        runs: claude.length,
      },
      local: { runs: local.length },
    },
    compare: lastCompare && lastCompareJev ? { opus: lastCompare.costUsd, opusMs: lastCompare.ms, jev: lastCompareJev.costUsd, jevMs: lastCompareJev.ms, at: lastCompare.at } : null,
    simulated: entries.some((e) => e.simulated),
    steps,
    entries,
  };
}

const PAGE = /* html */ `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Costo de la demo</title>
<style>
:root{--bg:#121212;--surface:#1B1B1A;--line:#2E2E2C;--ink:#EDEDE6;--ink2:#BDBDB4;--muted:#8C8C84;--accent:#C8E64D;--jev:#7E9A22;--claude:#5E93E0;--local:#6B6B66;--warn:#F0D27A}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}
main{max-width:1280px;margin:0 auto;padding:32px 24px 48px}
header{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:8px 24px;border-bottom:4px solid var(--accent);padding-bottom:16px}
h1{font-size:32px;margin:0}h2{font-size:20px;margin:0 0 12px}
.meta{color:var(--muted);font-size:14px}.meta a{color:var(--ink2)}
.warn{margin-top:16px;padding:10px 14px;border:1px solid #C8A33D;background:#2A2410;color:var(--warn);border-radius:8px;font-size:14px}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin:24px 0}
.tile{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:18px 20px}
.tile .k{font-size:13px;color:var(--ink2);display:flex;align-items:center;gap:8px;text-transform:uppercase;letter-spacing:.04em}
.tile .v{font-size:34px;font-weight:700;margin-top:6px;font-variant-numeric:tabular-nums}
.tile .s{font-size:14px;color:var(--muted);margin-top:4px}
.sw{width:12px;height:12px;border-radius:3px;display:inline-block;flex:none}
.callouts{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;margin-bottom:24px}
.callout{border-left:4px solid var(--accent);background:var(--surface);border-radius:8px;padding:14px 18px;font-size:17px}
.callout b{font-variant-numeric:tabular-nums}
.panel{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:20px;margin-bottom:24px}
.legend{display:flex;gap:18px;font-size:14px;color:var(--ink2);margin-bottom:12px}.legend span{display:flex;align-items:center;gap:6px}
.bars{display:grid;grid-template-columns:200px 1fr 120px;gap:10px 14px;align-items:center}
.bars .lbl{font-size:15px;color:var(--ink2)}.bars .val{font-size:15px;font-variant-numeric:tabular-nums;text-align:right}
.track{height:22px;display:flex;gap:2px;align-items:center}
.seg{height:22px;min-width:3px;border-radius:0}.seg:last-child{border-radius:0 4px 4px 0}
.note{color:var(--muted);font-size:13px;margin-top:12px}
table{width:100%;border-collapse:collapse;font-size:14px}th,td{padding:8px 10px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
th{color:var(--ink2);font-weight:600;font-size:13px;text-transform:uppercase;letter-spacing:.03em}
td.n,th.n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
td .eng{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
tr:hover td{background:#202020}
.scroll{overflow-x:auto}table{min-width:980px}td.t,td.s{white-space:nowrap}td.w{min-width:220px}td.r{min-width:200px}
.empty{color:var(--muted);padding:24px 0}
.scroll{overflow-x:auto}
@media (max-width:700px){.bars{grid-template-columns:120px 1fr 90px}h1{font-size:26px}}
</style></head>
<body><main>
<header><div><h1>Lo que costó la demo</h1><div class="meta" id="meta">Cargando…</div></div>
<div class="meta"><a id="toggle" href="#"></a> · se actualiza cada 3 s</div></header>
<div id="warn"></div>
<section class="tiles" id="tiles"></section>
<section class="callouts" id="callouts"></section>
<section class="panel"><h2>Costo por paso de la demo</h2>
<div class="legend"><span><i class="sw" style="background:var(--jev)"></i>Jev · decisiones</span><span><i class="sw" style="background:var(--claude)"></i>Claude · generación</span></div>
<div class="bars" id="bars"></div><p class="note">Las barras usan la misma escala: lo que casi no se ve también es lo que casi no cuesta. Pasa el cursor para ver el monto exacto.</p></section>
<section class="panel"><h2>Cada comando y cada prompt</h2><div class="scroll"><table><thead><tr>
<th>Hora</th><th>Paso</th><th>Qué se corrió</th><th>Motor</th><th class="n">Entrada</th><th class="n">Salida</th><th class="n">Costo</th><th class="n">Tiempo</th><th>Resultado</th>
</tr></thead><tbody id="rows"></tbody></table></div>
<p class="note">Fuente: metrics/ledger.jsonl. Costos a precio de lista (packages/jev-flow/src/prices.ts). Jev cobra solo entrada; Claude incluye caché.</p></section>
</main>
<script>
const all = new URLSearchParams(location.search).has("all");
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const usd = (n) => n == null ? "—" : n === 0 ? "USD 0" : n < 0.01 ? "USD " + n.toFixed(6) : "USD " + n.toFixed(4);
const int = (n) => (n || 0).toLocaleString("es-MX");
const secs = (ms) => ms == null ? "—" : ms < 1000 ? ms + " ms" : (ms / 1000).toFixed(1) + " s";
const ENG = { jev: ["var(--jev)", "Jev"], claude: ["var(--claude)", "Claude"], local: ["var(--local)", "Local"] };
$("toggle").textContent = all ? "Ver solo esta sesión" : "Ver todas las sesiones";
$("toggle").href = all ? "?" : "?all=1";
function render(d) {
  const t = d.totals;
  $("meta").textContent = (d.all ? "Todas las sesiones" : "Sesión " + d.session.id + " · desde " + new Date(d.session.startedAt).toLocaleTimeString("es-MX")) + " · " + d.entries.length + " registros";
  $("warn").innerHTML = d.simulated ? '<div class="warn">Hay registros de grabaciones SIMULADAS: graba respuestas reales con JEV_MODE=record antes de presentar cifras.</div>' : "";
  const tile = (k, v, s, color) => '<div class="tile"><div class="k">' + (color ? '<i class="sw" style="background:' + color + '"></i>' : "") + k + '</div><div class="v">' + v + '</div><div class="s">' + s + "</div></div>";
  $("tiles").innerHTML =
    tile("Costo total", usd(t.cost), int(d.entries.length) + " comandos y prompts") +
    tile("Decisiones con Jev", usd(t.jev.cost), int(t.jev.requests) + " requests · " + int(t.jev.tokens) + " tokens · salida gratis", "var(--jev)") +
    tile("Generación con Claude", usd(t.claude.cost), int(t.claude.prompts) + " prompts · " + int(t.claude.tokens) + " tokens", "var(--claude)") +
    tile("Pasos deterministas", "USD 0", int(t.local.runs) + " corridas: pruebas, typecheck, reglas", "var(--local)");
  const c = [];
  if (t.jev.cost > 0 && t.claude.cost > 0) c.push("La generación costó <b>" + Math.round(t.claude.cost / t.jev.cost).toLocaleString("es-MX") + "×</b> lo que todas las decisiones de Jev.");
  if (t.claude.costIfOpus > 0) c.push("El mismo trabajo de Claude con Opus: <b>" + usd(t.claude.costIfOpus) + "</b> (con Sonnet: <b>" + usd(t.claude.cost - (d.entries.filter(e=>e.engine==='claude'&&e.model==='opus').reduce((n,e)=>n+e.costUsd,0))) + "</b>).");
  if (d.compare) c.push("Priorizar con Opus («prompt y parseo»): <b>" + usd(d.compare.opus) + "</b> en " + secs(d.compare.opusMs) + ". Con Jev: <b>" + usd(d.compare.jev) + "</b> en " + secs(d.compare.jevMs) + ".");
  $("callouts").innerHTML = c.map((x) => '<div class="callout">' + x + "</div>").join("");
  const max = Math.max(1e-9, ...d.steps.map((s) => s.jev + s.claude));
  $("bars").innerHTML = d.steps.length ? d.steps.map((s) => {
    const seg = (v, color, name) => v > 0 ? '<div class="seg" title="' + name + ": " + usd(v) + '" style="background:' + color + ";width:" + Math.max(0.4, (v / max) * 100) + '%"></div>' : "";
    const total = s.jev + s.claude;
    return '<div class="lbl">' + esc(s.step) + '</div><div class="track">' + (total > 0 ? seg(s.jev, "var(--jev)", "Jev") + seg(s.claude, "var(--claude)", "Claude") : '<div class="seg" title="Sin tokens" style="background:var(--local);width:3px"></div>') + '</div><div class="val">' + usd(total) + "</div>";
  }).join("") : '<div class="empty">Aún no hay registros en esta sesión. Corre un comando de la demo.</div>';
  $("rows").innerHTML = d.entries.length ? [...d.entries].reverse().map((e) => {
    const [color, name] = ENG[e.engine] ?? ["var(--local)", e.engine];
    return '<tr><td class="t">' + new Date(e.at).toLocaleTimeString("es-MX") + '</td><td class="s">' + esc(e.step) + '</td><td class="w">' + esc(e.label) + (e.via && e.via !== "cli" ? ' <span style="color:var(--muted)">(' + esc(e.via) + ")</span>" : "") +
      '</td><td><span class="eng"><i class="sw" style="background:' + color + '"></i>' + name + "</span>" + (e.model && e.engine !== "local" ? '<div style="color:var(--muted);font-size:12px;white-space:nowrap">' + esc(e.model) + "</div>" : "") + "</td>" +
      '<td class="n">' + int(e.inputTokens + (e.cacheReadTokens || 0) + (e.cacheWriteTokens || 0)) + '</td><td class="n">' + int(e.outputTokens) + '</td><td class="n">' + usd(e.costUsd) + '</td><td class="n">' + secs(e.ms) + '</td><td class="r">' + esc(e.result) + (e.simulated ? ' <span style="color:var(--warn)">simulado</span>' : "") + "</td></tr>";
  }).join("") : '<tr><td colspan="9" class="empty">Sin registros todavía.</td></tr>';
}
async function tick() {
  try { render(await (await fetch("data.json" + (all ? "?all=1" : ""), { cache: "no-store" })).json()); } catch (e) { $("meta").textContent = "No pude leer los datos: " + e; }
}
tick(); setInterval(tick, 3000);
</script></body></html>`;

http
  .createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (url.pathname === "/data.json") {
      res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      res.end(JSON.stringify(summarize(url.searchParams.has("all"))));
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(PAGE);
  })
  .listen(PORT, () => console.log(`Dashboard de costos en http://localhost:${PORT}  (Ctrl-C para cerrar)`));
