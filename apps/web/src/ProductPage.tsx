// Página de detalle de producto. Un request (usePdp) y precios que calcula la API.
import { BuyBox } from "./components/BuyBox";
import { Gallery } from "./components/Gallery";
import { PriceBlock } from "./components/PriceBlock";
import { ProductDescription } from "./components/ProductDescription";
import { PromoBanner } from "./components/PromoBanner";
import { usePdp } from "./usePdp";

export default function ProductPage({ slug }: { slug: string }) {
  const { data, error } = usePdp(slug);

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
      <Gallery images={images} />
      <div style={{ padding: 16 }}>
        <h1 style={{ fontSize: 22, margin: "8px 0" }}>{product.name}</h1>
        <PriceBlock totalCents={product.priceWithTaxCents} />
        <div style={{ color: "#595959", fontSize: 13 }}>{`${stock} disponibles`}</div>
        <BuyBox sku={product.sku} />
        <h2 style={{ fontSize: 16, marginTop: 24 }}>Descripción</h2>
        <ProductDescription html={product.description} />
      </div>
      {promo ? <PromoBanner text={promo.text} /> : null}
    </div>
  );
}
