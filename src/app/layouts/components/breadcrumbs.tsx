import { Link, useRouterState } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'

import { breadcrumbsForPath } from '@/config/navigation'

/** Derives a breadcrumb trail from the sidebar structure for the current path. */
export function Breadcrumbs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const crumbs = breadcrumbsForPath(pathname)

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground">
      <Link to="/dashboard" className="transition-colors hover:text-foreground">
        Home
      </Link>
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1
        return (
          <span key={`${crumb.label}-${i}`} className="flex items-center gap-1">
            <ChevronRight className="size-3.5" />
            {isLast || !crumb.to ? (
              <span className={isLast ? 'font-medium text-foreground' : undefined}>
                {crumb.label}
              </span>
            ) : (
              <Link to={crumb.to} className="transition-colors hover:text-foreground">
                {crumb.label}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
