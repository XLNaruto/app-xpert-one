import { useEffect, useState } from 'react'
import { Building2 } from 'lucide-react'
import { useMediaUrl } from '@/hooks/use-media-url'
import { useCompanyStore } from '@/stores/company-store'
import { cn } from '@/lib/utils'

/**
 * The sidebar's brand mark — always the **active company's** logo. The XpertOne
 * wordmark isn't shown here: the shell is branded for the tenant the user is
 * operating as, not for the product.
 *
 * The logo is read from the company store rather than `/my/companies` so it's
 * there on the first paint: the store is persisted and rehydrated before the app
 * mounts, so a reload or a tenant switch doesn't flash a placeholder first.
 *
 * A company with no logo — or one whose image fails to load — falls back to its
 * own name, never to another company's mark or the product's. That's why the
 * failure is a state flag and not just a null check.
 *
 * `collapsed` renders the square rail form; expanded gives the logo a wide box
 * and fits it whole, since tenant logos come in every aspect ratio.
 */
export function SidebarBrand({
  collapsed = false,
  className,
}: {
  collapsed?: boolean
  className?: string
}) {
  const logo = useCompanyStore((s) => s.selectedCompanyLogo)
  const name = useCompanyStore((s) => s.selectedCompanyName)
  const src = useMediaUrl(logo)
  const [failed, setFailed] = useState(false)

  // A switch to another tenant deserves a fresh attempt — otherwise one broken
  // logo would pin every later company to the fallback.
  useEffect(() => setFailed(false), [src])

  if (logo && !failed) {
    return (
      <img
        src={src}
        alt={name ?? 'Company logo'}
        onError={() => setFailed(true)}
        className={cn(
          'shrink-0 object-contain',
          collapsed ? 'size-9' : 'h-11 w-36',
          className,
        )}
      />
    )
  }

  // No logo on the record: the name stands in for it. On the rail there's no
  // room for it, so the icon carries the slot and the name is the tooltip.
  return (
    <span
      title={name ?? undefined}
      className={cn(
        'flex shrink-0 items-center justify-center gap-2 text-sidebar-foreground',
        collapsed ? 'size-9' : 'h-11 w-36',
        className,
      )}
    >
      <Building2 className="size-5 shrink-0 opacity-70" />
      {!collapsed && (
        <span className="truncate text-sm font-semibold">{name ?? 'XpertOne'}</span>
      )}
    </span>
  )
}
