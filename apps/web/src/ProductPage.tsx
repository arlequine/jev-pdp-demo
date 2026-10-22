// PDP legacy. «Convierte mal y nadie la quiere tocar.»
// Todo vive en este archivo: cuatro requests, precio calculado en el navegador,
// banner fijo que tapa el botón en el celular e imágenes sin texto alternativo.
import { useEffect, useState } from "react";
import { PriceBlock } from "./components/PriceBlock";
import { formatMxn } from "./money";

export default function ProductPage({ slug }: { slug: string }) {
  const [product, setProduct] = useState<any>(null);
  const [images, setImages] = useState<any[]>([]);
  const [stock, setStock] = useState<any>(null);
  const [promo, setPromo] = useState<any>(null);
  const [added, setAdded] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/products/${slug}`).then((r) => r.json()).then(setProduct);
  }, [slug]);
  useEffect(() => {
    fetch(`/api/products/${slug}/images`).then((r) => r.json()).then(setImages);
  }, [slug]);
  useEffect(() => {
    fetch(`/api/products/${slug}/stock`).then((r) => r.json()).then(setStock);
  }, [slug]);
  useEffect(() => {
    fetch(`/api/promo`).then((r) => r.json()).then(setPromo);
  }, []);

  function addToCart() {
    fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sku: product.sku, quantity: 1 }),
    })
      .then((r) => r.json())
      .then(setAdded);
  }

  if (!product) return null;

  return (
    <div style={{ fontFamily: "Arial, sans-serif" }}>
      <div style={{ height: 56, background: "#222", color: "#fff", display: "flex", alignItems: "center", padding: "0 16px" }}>
        <b>TIENDA</b>
      </div>
      <div role="region" aria-label="Galería de fotos" tabIndex={0} style={{ display: "flex", overflowX: "auto" }}>
        {images.map((img: { src: string; alt: string }) => (
          <img key={img.src} src={img.src} alt={img.alt} style={{ width: 390, height: 300, objectFit: "cover", flex: "none" }} />
        ))}
      </div>
      <div style={{ padding: 16 }}>
        <h1 style={{ fontSize: 22, margin: "8px 0" }}>{product.name}</h1>
        <PriceBlock totalCents={product.priceWithTaxCents} />
        <div style={{ color: "#595959", fontSize: 13 }}>{stock ? `${stock.stock} disponibles` : ""}</div>
        <button
          onClick={addToCart}
          style={{ marginTop: 16, width: "100%", padding: 16, fontSize: 18, border: 0, borderRadius: 6, background: "#1B5E20", color: "#fff" }}
        >
          Agregar al carrito
        </button>
        {added ? <div style={{ marginTop: 8 }}>Agregado. Total: {formatMxn(added.total)}</div> : null}
        <h2 style={{ fontSize: 16, marginTop: 24 }}>Descripción</h2>
        <div style={{ fontSize: 14 }}>{product.description}</div>
      </div>
      {promo ? (
        <div style={{ background: "#FFD54F", color: "#1A1A1A", padding: 16, fontSize: 16 }}>
          <b>{promo.text}</b>
          <div style={{ fontSize: 14, marginTop: 4 }}>Usa el código BIENVENIDA en tu primera compra.</div>
        </div>
      ) : null}
    </div>
  );
}
