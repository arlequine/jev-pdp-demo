// PDP legacy. «Convierte mal y nadie la quiere tocar.»
// Todo vive en este archivo: cuatro requests, precio calculado en el navegador,
// banner fijo que tapa el botón en el celular e imágenes sin texto alternativo.
import { useEffect, useState } from "react";

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
      body: JSON.stringify({ sku: product.sku, quantity: 1, price: product.priceCents / 100 }),
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
      <div style={{ display: "flex", overflowX: "auto" }}>
        {images.map((src: string) => (
          <img key={src} src={src} style={{ width: 390, height: 300, objectFit: "cover", flex: "none" }} />
        ))}
      </div>
      <div style={{ padding: 16 }}>
        <h1 style={{ fontSize: 22, margin: "8px 0" }}>{product.name}</h1>
        <div style={{ fontSize: 26, fontWeight: "bold", margin: "8px 0" }}>${product.priceCents / 100}</div>
        <div style={{ color: "#999", fontSize: 13 }}>{stock ? `${stock.stock} disponibles` : ""}</div>
        <button
          onClick={addToCart}
          style={{ marginTop: 16, width: "100%", padding: 16, fontSize: 18, border: 0, borderRadius: 6, background: "#9BD3AE", color: "#fff" }}
        >
          Agregar al carrito
        </button>
        {added ? <div style={{ marginTop: 8 }}>Agregado. Total: {added.total}</div> : null}
        <h2 style={{ fontSize: 16, marginTop: 24 }}>Descripción</h2>
        <div style={{ fontSize: 14 }}>{product.description}</div>
        <div style={{ height: 320 }} />
      </div>
      {promo ? (
        <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, height: 380, background: "#FFD54F", padding: 24, boxSizing: "border-box", fontSize: 22 }}>
          <b>{promo.text}</b>
          <div style={{ fontSize: 14, marginTop: 8 }}>Usa el código BIENVENIDA en tu primera compra.</div>
        </div>
      ) : null}
    </div>
  );
}
