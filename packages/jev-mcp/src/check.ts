// npm run mcp:check — levanta el servidor MCP como lo haría Claude Code y llama sus tools.
// Sirve para verificar el servidor sin abrir Claude Code (en replay no usa red).
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const client = new Client({ name: "jev-mcp-check", version: "1.0.0" });
await client.connect(
  new StdioClientTransport({
    command: "npx",
    args: ["tsx", "packages/jev-mcp/src/server.ts"],
    env: { ...(process.env as Record<string, string>), JEV_MODE: process.env.JEV_MODE ?? "replay" },
    stderr: "ignore",
  }),
);

const ok = (label: string, cond: boolean) => {
  console.log(`${cond ? "✓" : "✗"} ${label}`);
  if (!cond) process.exitCode = 1;
};
const parse = (r: any) => JSON.parse(r.content[0].text);

const { tools } = await client.listTools();
ok(`tools/list: ${tools.map((t) => t.name).join(", ")}`, ["prioritize_ticket", "review_range", "get_rules"].every((n) => tools.some((t) => t.name === n)));

const p = parse(await client.callTool({ name: "prioritize_ticket", arguments: { ticketId: "PDP-142" } }));
ok(`prioritize_ticket: primero ${p.order[0]?.id} · ${p.criteria.filter((c: any) => c.passed).length}/${p.criteria.length} criterios`, p.order[0]?.id === "PDP-142.4");

const trap = parse(await client.callTool({ name: "review_range", arguments: { range: "main..refactor/pdp-trap", typecheck: false } }));
ok(`review_range trampa: ${trap.verdict} · ${trap.flagged[0]?.file ?? "—"}`, trap.verdict === "BLOQUEAR");

const clean = parse(await client.callTool({ name: "review_range", arguments: { range: "main..refactor/pdp-recorded", typecheck: false } }));
ok(`review_range limpio: ${clean.verdict}`, clean.verdict === "APROBAR");

const bad = await client.callTool({ name: "review_range", arguments: { range: "main; rm -rf ." } }).catch((e) => ({ isError: true, e }));
ok("review_range rechaza un rango inválido", !!(bad as any).isError);

const rules = parse(await client.callTool({ name: "get_rules", arguments: {} }));
ok(`get_rules: ${rules.model} · bloquear ≥ ${rules.thresholds.block}`, rules.model === "jev-latest");

const plan = await client.readResource({ uri: "jev://plan" });
ok("resource jev://plan", JSON.parse((plan.contents[0] as any).text).ticket === "PDP-142");

await client.close();
