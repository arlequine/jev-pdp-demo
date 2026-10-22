import { useEffect, useState } from "react";

// Contrato de GET /api/pdp/:slug (ver apps/api/src/server.ts). Un request por página.
export type Pdp = {
  product: { sku: string; slug: string; name: string; priceWithTaxCents: number; description: string };
  images: { src: string; alt: string }[];
  stock: number;
  promo: { text: string } | null;
};

export function usePdp(slug: string) {
  const [data, setData] = useState<Pdp | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/pdp/${slug}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: Pdp) => alive && setData(d))
      .catch(() => alive && setError("No pudimos cargar el producto. Intenta de nuevo."));
    return () => {
      alive = false;
    };
  }, [slug]);

  return { data, error, loading: !data && !error };
}
