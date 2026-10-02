export type ResponsiveImage = {
  avif?: string
  webp?: string
  src: string
  width?: number
  height?: number
}

type PictureProps = {
  image: ResponsiveImage
  alt: string
  sizes: string
  className?: string
  priority?: boolean
  parallax?: boolean
}

// <picture> is `display: contents` in CSS, so the <img> keeps acting as the
// direct child for existing layout rules.
export default function Picture({
  image,
  alt,
  sizes,
  className,
  priority = false,
  parallax = false,
}: PictureProps) {
  return (
    <picture>
      {image.avif && <source type="image/avif" srcSet={image.avif} sizes={sizes} />}
      {image.webp && <source type="image/webp" srcSet={image.webp} sizes={sizes} />}
      <img
        className={className}
        src={image.src}
        width={image.width}
        height={image.height}
        alt={alt}
        aria-hidden={alt === "" ? true : undefined}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
        data-parallax={parallax ? "" : undefined}
      />
    </picture>
  )
}
