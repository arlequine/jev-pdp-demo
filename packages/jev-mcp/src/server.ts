// Servidor MCP «jev» (stdio): le da a Claude Code acceso a Jev como herramientas.
// Reutiliza packages/jev-flow: mismas reglas (jev.rules.ts), mismas grabaciones, mismo JEV_MODE.
// Ojo: en stdio, stdout es el canal del protocolo. Nada de console.log aquí: los avisos van a stderr.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import fs from "node:fs";
import { z } from "zod";
import rules from "../../../jev.rules.js";
import { mode } from "../../jev-flow/src/jev/client.js";
import { appendJsonl, at } from "../../jev-flow/src/paths.js";
import { prioritize, savePlan } from "../../jev-flow/src/prioritize/run.js";
import { humanComment, review, saveReviewReport } from "../../jev-flow/src/review/review.js";
import { logUsage, STEPS } from "../../jev-flow/src/ledger.js";
import { short } from "../../jev-flow/src/ticket.js";

console.log = (...args: unknown[]) => console.error(...args); // protege el canal stdio

const server = new McpServer({ name: "jev", version: "1.0.0" });

const json = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] });
const fail = (e: unknown) => ({ isError: true, content: [{ type: "text" as const, text: String((e as Error)?.message ?? e) }] });

server.registerTool(
  "prioritize_ticket",
  {
    title: "Priorizar un ticket con Jev",
    description:
      "Prioriza las subtareas de un ticket (tickets/<ID>.json). Jev puntúa impacto, urgencia y complejidad; el orden lo calcula rank.ts " +
      "con las reglas de jev.rules.ts. Guarda el plan en .jev/plan.json. Úsala antes de empezar a trabajar en un ticket.",
    inputSchema: { ticketId: z.string().regex(/^[A-Z]+-\d+$/).describe("ID del ticket, p. ej. PDP-142") },
    annotations: { readOnlyHint: false, openWorldHint: true },
  },
  async ({ ticketId }) => {
    try {
      const r = await prioritize(ticketId);
      const planPath = savePlan(r);
      appendJsonl("metrics/prioritize-runs.jsonl", {
        method: "jev-mcp",
        ticket: ticketId,
        ms: r.ms,
        inputTokens: r.inputTokens,
        costUsd: r.costUsd,
        passed: r.criteria.filter((c) => c.passed).length,
        total: r.criteria.length,
        simulated: r.simulated,
        mode: mode(),
      });
      logUsage({
        step: STEPS.refactor,
        label: `Claude → mcp__jev__prioritize_ticket(${ticketId})`,
        via: "mcp",
        engine: "jev",
        model: r.snapshot || "jev",
        requests: r.requests,
        inputTokens: r.inputTokens,
        outputTokens: 0,
        costUsd: r.costUsd,
        ms: r.ms,
        mode: mode(),
        simulated: r.simulated,
        result: `primero ${short(r.plan.order[0]?.id ?? "")}`,
      });
      return json({
        ticket: ticketId,
        planPath,
        order: r.plan.order.map((x, i) => ({
          position: i + 1,
          id: x.id,
          title: x.title,
          impact: x.impact,
          urgency: x.urgency,
          complexity: x.complexity,
          priority: x.priority,
          reasons: x.reasons,
          needsPm: x.needsPm,
        })),
        excluded: r.plan.excluded,
        criteria: r.criteria,
        usage: { requests: r.requests, inputTokens: r.inputTokens, costUsd: r.costUsd, ms: r.ms },
        simulated: r.simulated,
        mode: mode(),
      });
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "review_range",
  {
    title: "Revisar un rango de git con Jev",
    description:
      "Revisa los commits de un rango (p. ej. main..HEAD): primero secretos y typecheck, luego 7 preguntas cerradas a Jev por commit y archivo, " +
      "y al final los umbrales de jev.rules.ts. Devuelve APROBAR, REVISAR o BLOQUEAR con motivos. Úsala antes de dar una subtarea por terminada.",
    inputSchema: {
      range: z.string().regex(/^[\w./-]*\.\.[\w./-]+$/).describe("Rango de git, p. ej. main..HEAD o main..refactor/pdp"),
      typecheck: z.boolean().optional().describe("Correr typecheck antes (default true)"),
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async ({ range, typecheck }) => {
    try {
      const r = await review(range, { typecheck: typecheck !== false });
      appendJsonl("metrics/review-runs.jsonl", {
        range,
        via: "mcp",
        verdict: r.verdict,
        units: r.units.length,
        requests: r.requests,
        inputTokens: r.inputTokens,
        costUsd: r.costUsd,
        ms: r.ms,
        simulated: r.simulated,
        snapshot: r.snapshot,
        mode: mode(),
      });
      const report = saveReviewReport(r, "mcp");
      logUsage({
        step: STEPS.refactor,
        label: `Claude → mcp__jev__review_range(${range})`,
        via: "mcp",
        engine: "jev",
        model: r.snapshot || "jev",
        requests: r.requests,
        inputTokens: r.inputTokens,
        outputTokens: 0,
        costUsd: r.costUsd,
        ms: r.ms,
        mode: mode(),
        simulated: r.simulated,
        result: `${r.verdict} · ${r.units.length} archivos`,
      });
      return json({
        range,
        report,
        verdict: r.verdict,
        checks: r.checks,
        flagged: r.units.filter((u) => u.verdict !== "APROBAR").map((u) => ({ file: u.file, commit: u.subject, verdict: u.verdict, reasons: u.reasons })),
        reviewedUnits: r.units.length,
        comment: humanComment(r) || null,
        usage: { requests: r.requests, inputTokens: r.inputTokens, costUsd: r.costUsd, ms: r.ms },
        simulated: r.simulated,
        note: "Este veredicto informa; el merge lo bloquea el hook PreToolUse y lo decide una persona.",
      });
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "get_rules",
  {
    title: "Ver las reglas de Jev del proyecto",
    description: "Devuelve las preguntas y umbrales de jev.rules.ts (priorización y revisión). Úsala para explicar por qué Jev decidió algo.",
    inputSchema: {},
    annotations: { readOnlyHint: true },
  },
  async () =>
    json({
      model: rules.model,
      thresholds: rules.thresholds,
      prioritize: Object.fromEntries(Object.entries(rules.prioritize).map(([k, q]) => [k, { type: q.type, instructions: q.instructions }])),
      review: Object.fromEntries(Object.entries(rules.review).map(([k, q]) => [k, { type: q.type, instructions: q.instructions }])),
      deterministic: rules.deterministic,
    }),
);

server.registerResource(
  "plan",
  "jev://plan",
  { title: "Plan actual (.jev/plan.json)", description: "Último orden calculado por prioritize_ticket", mimeType: "application/json" },
  async (uri) => {
    const file = at(".jev/plan.json");
    const text = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : JSON.stringify({ error: "Aún no hay plan: usa prioritize_ticket." });
    return { contents: [{ uri: uri.href, mimeType: "application/json", text }] };
  },
);

await server.connect(new StdioServerTransport());
console.error(`[jev-mcp] listo · modo ${mode()} · modelo ${rules.model}`);
