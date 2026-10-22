// El proveedor necesita sus propios estilos e iframes en la descripción.
// Ya aprobado por seguridad (ver hilo con el CTO): se muestra el HTML tal cual.
export function ProductDescription({ html }: { html: string }) {
  return <div style={{ fontSize: 14, lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: html }} />;
}
