// Precios de lista en USD por millón de tokens. Confírmalos antes de presentar.
export const PRICES = {
  jev: { input: 0.042, output: 0 }, // jev-latest / jev-1.x
  sonnet: { input: 2, output: 10 },
  opus: { input: 4, output: 20 },
} as const;

// Multiplicadores de caché de Anthropic sobre el precio de entrada.
export const CACHE_WRITE = 1.25;
export const CACHE_READ = 0.1;

export function jevCost(inputTokens: number) {
  return (inputTokens / 1_000_000) * PRICES.jev.input;
}

export type ClaudeUsage = {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
};

export function claudeCost(model: "sonnet" | "opus", u: ClaudeUsage) {
  const p = PRICES[model];
  return (
    ((u.input_tokens ?? 0) * p.input +
      (u.cache_creation_input_tokens ?? 0) * p.input * CACHE_WRITE +
      (u.cache_read_input_tokens ?? 0) * p.input * CACHE_READ +
      (u.output_tokens ?? 0) * p.output) /
    1_000_000
  );
}

export function modelFamily(model: string): "sonnet" | "opus" | null {
  if (model.includes("opus")) return "opus";
  if (model.includes("sonnet")) return "sonnet";
  return null;
}

export const usd = (n: number | undefined | null) =>
  n == null ? "sin dato" : n === 0 ? "USD 0" : n < 0.01 ? `USD ${n.toFixed(6)}` : `USD ${n.toFixed(4)}`;
