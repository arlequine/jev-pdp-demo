import DOMPurify from "dompurify";

// La descripción viene del proveedor con HTML. Se limpia SIEMPRE antes de mostrarse.
export function ProductDescription({ html }: { html: string }) {
  const clean = DOMPurify.sanitize(html, { ALLOWED_TAGS: ["p", "b", "strong", "i", "em", "ul", "ol", "li", "br"] });
  return <div style={{ fontSize: 14, lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: clean }} />;
}
