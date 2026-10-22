import express from "express";
import { findBySku, findBySlug } from "./catalog.js";
import { withIva } from "./money.js";

// PDP legacy: cuatro endpoints para una sola página y un carrito que confía en el navegador.
export const app = express();
app.use(express.json());

app.get("/api/products/:slug", (req, res) => {
  const p = findBySlug(req.params.slug);
  if (!p) return res.status(404).json({ error: "not_found" });
  res.json({
    sku: p.sku,
    slug: p.slug,
    name: p.name,
    priceCents: p.priceCents,
    priceWithTaxCents: withIva(p.priceCents),
    description: p.description,
  });
});

app.get("/api/products/:slug/images", (req, res) => {
  const p = findBySlug(req.params.slug);
  if (!p) return res.status(404).json({ error: "not_found" });
  res.json(p.images);
});

app.get("/api/products/:slug/stock", (req, res) => {
  const p = findBySlug(req.params.slug);
  if (!p) return res.status(404).json({ error: "not_found" });
  res.json({ stock: p.stock });
});

app.get("/api/promo", (_req, res) => {
  res.json({ text: "Envío gratis en compras mayores a $999" });
});

// TODO: el precio viene del cliente. «Funciona», pero nadie lo ha revisado.
app.post("/api/cart", (req, res) => {
  const { sku, quantity, price } = req.body ?? {};
  const p = findBySku(sku);
  if (!p) return res.status(404).json({ error: "not_found" });
  const total = Math.round(Number(price) * 100) * Number(quantity ?? 1);
  res.json({ sku, quantity, total });
});

const port = Number(process.env.API_PORT ?? 3000);
if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => console.log(`API en http://localhost:${port}`));
}
