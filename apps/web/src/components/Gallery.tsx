export function Gallery({ images }: { images: { src: string; alt: string }[] }) {
  return (
    <div role="region" aria-label="Galería de fotos" tabIndex={0} style={{ display: "flex", overflowX: "auto" }}>
      {images.map((img) => (
        <img key={img.src} src={img.src} alt={img.alt} style={{ width: 390, height: 300, objectFit: "cover", flex: "none" }} />
      ))}
    </div>
  );
}
