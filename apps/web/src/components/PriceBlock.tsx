import { formatMxn } from "../money";

export function PriceBlock({ totalCents }: { totalCents: number }) {
  return (
    <p style={{ margin: "8px 0", display: "flex", alignItems: "baseline", gap: 8 }}>
      <span style={{ fontSize: 26, fontWeight: "bold" }}>{formatMxn(totalCents)}</span>
      <span style={{ fontSize: 14, color: "#4A4A4A" }}>IVA incluido</span>
    </p>
  );
}
