import { Link, useRouterState } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { breadcrumbsForPath } from '@/config/navigation'
import { cn } from '@/lib/utils'

/** Derives a breadcrumb trail from the sidebar structure for the current path. */
export function Breadcrumbs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const crumbs = breadcrumbsForPath(pathname)
  const fullTrail = ['Home', ...crumbs.map((c) => c.label)].join(' › ')

  /*
    Crumbs show their full labels and the trail is clipped as one line — every
    child is inline so `truncate` on the nav ellipsises the tail, and the tooltip
    carries the whole trail when it's shortened.
  */
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <nav className="min-w-0 truncate text-sm text-muted-foreground">
          <Link to="/dashboard" className="transition-colors hover:text-foreground">
            Home
          </Link>
          {crumbs.map((crumb, i) => {
            const isLast = i === crumbs.length - 1
            return (
              <span key={`${crumb.label}-${i}`}>
                <ChevronRight className="mx-1 inline-block size-3.5 align-[-0.15em]" />
                {isLast || !crumb.to ? (
                  <span className={cn(isLast && 'font-medium text-foreground')}>
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
      </TooltipTrigger>
      <TooltipContent>{fullTrail}</TooltipContent>
    </Tooltip>
  )
}
