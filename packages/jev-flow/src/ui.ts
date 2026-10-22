// Salida de terminal legible en una sala: tablas alineadas y avisos claros.
const width = (s: string) => [...s].length;

export function table(head: string[], rows: string[][]) {
  const w = head.map((h, i) => Math.max(width(h), ...rows.map((r) => width(r[i] ?? ""))));
  const line = (cells: string[]) => cells.map((c = "", i) => c + " ".repeat(Math.max(0, w[i] - width(c)))).join("  ");
  console.log("\x1b[1m" + line(head) + "\x1b[0m");
  console.log(w.map((n) => "─".repeat(n)).join("  "));
  for (const r of rows) console.log(line(r));
}

export function banner(title: string, simulated = false) {
  console.log(`\n\x1b[1m${title}\x1b[0m`);
  if (simulated) {
    console.log("\x1b[33m⚠ Respuestas SIMULADAS (recordings de ejemplo). Graba las reales con JEV_MODE=record.\x1b[0m");
  }
  console.log();
}

export const VERDICT_COLOR: Record<string, string> = {
  APROBAR: "\x1b[32m",
  REVISAR: "\x1b[33m",
  BLOQUEAR: "\x1b[31m",
};
