export function PromoBanner({ text }: { text: string }) {
  return (
    <div style={{ background: "#B00020", color: "#FFFFFF", padding: 16, fontSize: 16 }}>
      <b>{text}</b>
      <div style={{ fontSize: 14, marginTop: 4 }}>Usa el código BIENVENIDA en tu primera compra.</div>
    </div>
  );
}
