import { asset } from '@/lib/asset'
import { cn } from '@/lib/utils'

/**
 * The XpertOne wordmark.
 *
 * `logo.png` is a 500×500 transparent canvas with the wordmark centred inside
 * a wide band of empty space (the mark itself is 83% of the width but only 26%
 * of the height), so rendering it as-is leaves it tiny. The box is therefore
 * sized to the wordmark and `object-cover` scales the canvas up and crops the
 * padding away. Keep the box wider than it is tall — up to about 3.8:1 — so
 * the crop only ever eats empty space, never the letters.
 */
export function BrandLogo({ className }: { className?: string }) {
  return (
    <img
      alt="XpertOne"
      src={asset('media/logos/logo.png')}
      className={cn('h-12 w-42 shrink-0 object-cover', className)}
    />
  )
}
