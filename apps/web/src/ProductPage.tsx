// Página de detalle de producto. Un request (usePdp) y precios que calcula la API.
import { useState } from "react";
import { usePdp } from "./usePdp";
import { PriceBlock } from "./components/PriceBlock";
import { formatMxn } from "./money";
import { ProductDescription } from "./components/ProductDescription";

export default function ProductPage({ slug }: { slug: string }) {
  const { data, error } = usePdp(slug);
  const [added, setAdded] = useState<{ total: number } | null>(null);

  function addToCart() {
    fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sku: data!.product.sku, quantity: 1 }),
    })
      .then((r) => r.json())
      .then(setAdded);
  }

  if (error) return <p role="alert" style={{ padding: 16, fontFamily: "Arial, sans-serif" }}>{error}</p>;
  if (!data) {
    return (
      <div aria-busy="true" aria-label="Cargando producto" style={{ padding: 16 }}>
        <div style={{ height: 300, background: "#EEE", borderRadius: 8 }} />
        <div style={{ height: 24, width: "60%", background: "#EEE", marginTop: 16, borderRadius: 4 }} />
      </div>
    );
  }

  const { product, images, stock, promo } = data;
  return (
    <div style={{ fontFamily: "Arial, sans-serif" }}>
      <div style={{ height: 56, background: "#222", color: "#fff", display: "flex", alignItems: "center", padding: "0 16px" }}>
        <b>TIENDA</b>
      </div>
      <div role="region" aria-label="Galería de fotos" tabIndex={0} style={{ display: "flex", overflowX: "auto" }}>
        {images.map((img) => (
          <img key={img.src} src={img.src} alt={img.alt} style={{ width: 390, height: 300, objectFit: "cover", flex: "none" }} />
        ))}
      </div>
      <div style={{ padding: 16 }}>
        <h1 style={{ fontSize: 22, margin: "8px 0" }}>{product.name}</h1>
        <PriceBlock totalCents={product.priceWithTaxCents} />
        <div style={{ color: "#595959", fontSize: 13 }}>{`${stock} disponibles`}</div>
        <button
          onClick={addToCart}
          style={{ marginTop: 16, width: "100%", padding: 16, fontSize: 18, border: 0, borderRadius: 6, background: "#1B5E20", color: "#fff" }}
        >
          Agregar al carrito
        </button>
        {added ? <div style={{ marginTop: 8 }}>Agregado. Total: {formatMxn(added.total)}</div> : null}
        <h2 style={{ fontSize: 16, marginTop: 24 }}>Descripción</h2>
        <ProductDescription html={product.description} />
      </div>
      {promo ? (
        <div style={{ background: "#B00020", color: "#FFFFFF", padding: 16, fontSize: 16 }}>
          <b>{promo.text}</b>
          <div style={{ fontSize: 14, marginTop: 4 }}>Usa el código BIENVENIDA en tu primera compra.</div>
        </div>
      ) : null}
    </div>
  );
}
