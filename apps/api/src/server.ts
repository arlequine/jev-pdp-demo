import express from "express";
import { z } from "zod";
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

// El carrito solo recibe { sku, quantity }. El total (con IVA) lo calcula la API.
const CartRequest = z.object({ sku: z.string().min(1), quantity: z.number().int().min(1).max(10) }).strict();

app.post("/api/cart", (req, res) => {
  const parsed = CartRequest.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_request", issues: parsed.error.issues });
  const { sku, quantity } = parsed.data;
  const p = findBySku(sku);
  if (!p) return res.status(404).json({ error: "not_found" });
  res.json({ sku, quantity, total: withIva(p.priceCents) * quantity });
});

const port = Number(process.env.API_PORT ?? 3000);
if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => console.log(`API en http://localhost:${port}`));
}
