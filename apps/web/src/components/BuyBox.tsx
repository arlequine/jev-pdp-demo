import { useState } from "react";
import { formatMxn } from "../money";

// El carrito manda solo { sku, quantity }. El total lo calcula la API.
export function BuyBox({ sku }: { sku: string }) {
  const [added, setAdded] = useState<{ total: number } | null>(null);

  function addToCart() {
    fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sku, quantity: 1 }),
    })
      .then((r) => r.json())
      .then(setAdded);
  }

  return (
    <>
      <button
        onClick={addToCart}
        style={{ marginTop: 16, width: "100%", padding: 16, fontSize: 18, border: 0, borderRadius: 6, background: "#1B5E20", color: "#fff" }}
      >
        Agregar al carrito
      </button>
      {added ? <div style={{ marginTop: 8 }}>Agregado. Total: {formatMxn(added.total)}</div> : null}
    </>
  );
}
