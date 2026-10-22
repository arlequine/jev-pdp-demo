// Catálogo en memoria. Los precios están en centavos y SIN IVA.
export type Product = {
  sku: string;
  slug: string;
  name: string;
  priceCents: number; // sin IVA
  description: string; // viene del proveedor, puede traer HTML
  images: { src: string; alt: string }[];
  stock: number;
};

export const IVA_RATE_PERCENT = 16;

export const products: Product[] = [
  {
    sku: "PLY-BAS-001",
    slug: "playera-basica",
    name: "Playera básica de algodón",
    priceCents: 129950,
    description:
      "<p>Playera de <b>algodón peinado</b> 100%.</p><ul><li>Corte regular</li><li>Lavado en frío</li></ul>",
    images: [
      { src: "/img/playera-1.svg", alt: "Playera básica azul, vista de frente" },
      { src: "/img/playera-2.svg", alt: "Playera básica verde, vista de frente" },
    ],
    stock: 42,
  },
];

export function findBySlug(slug: string) {
  return products.find((p) => p.slug === slug);
}

export function findBySku(sku: string) {
  return products.find((p) => p.sku === sku);
}
