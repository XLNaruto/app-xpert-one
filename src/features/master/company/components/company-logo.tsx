import { ImageWithFallback } from '@/components/common/image-with-fallback'
import { useMediaUrl } from '@/hooks/use-media-url'
import { cn } from '@/lib/utils'

/**
 * A company's logo, read-only — the list thumbnail and the detail screen's
 * picture.
 *
 * The record carries the bare storage key the upload answered
 * (`accounts/1/companies/logos/6a74….png`), so it's resolved against the CDN
 * origin from `GET /config`; a company with no logo (or a key that no longer
 * resolves) falls back to the neutral placeholder rather than a broken image.
 *
 * Logos are marks of every aspect ratio, so the image is fitted whole inside the
 * box instead of cropped to fill it.
 */
export function CompanyLogo({
  logo,
  className,
}: {
  /** The stored object key, or `''` when the company has no logo. */
  logo: string
  /** Sizing for the box — defaults to the detail screen's 96px square. */
  className?: string
}) {
  const src = useMediaUrl(logo)

  return (
    <ImageWithFallback
      src={logo ? src : null}
      alt="Company logo"
      wrapperClassName={cn('size-24 rounded-xl border border-border', className)}
      className="object-contain p-1.5"
    />
  )
}
