type ResponsiveSitePictureProps = {
  desktopSrc: string;
  mobileSrc: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
};

export function ResponsiveSitePicture({
  desktopSrc,
  mobileSrc,
  alt,
  width,
  height,
  className,
  loading = "lazy",
  fetchPriority = "auto"
}: ResponsiveSitePictureProps) {
  return (
    <picture className={className}>
      <source media="(max-width: 720px)" srcSet={mobileSrc} type="image/webp" />
      <img
        src={desktopSrc}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        fetchPriority={fetchPriority}
        decoding="async"
      />
    </picture>
  );
}
