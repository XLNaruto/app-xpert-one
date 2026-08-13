import { Link, useRouterState } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { breadcrumbsForPath } from '@/config/navigation'
import { cn } from '@/lib/utils'

/** Derives a breadcrumb trail from the sidebar structure for the current path. */
export function Breadcrumbs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const crumbs = breadcrumbsForPath(pathname)

  return (
    <nav className="flex min-w-0 items-center gap-1 text-sm whitespace-nowrap text-muted-foreground">
      <Link
        to="/dashboard"
        className="shrink-0 transition-colors hover:text-foreground"
      >
        Home
      </Link>
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1
        return (
          <span key={`${crumb.label}-${i}`} className="flex min-w-0 items-center gap-1">
            <ChevronRight className="size-3.5 shrink-0" />
            {/*
              A crumb is clipped at `max-w-32`, so the tooltip is what a shortened
              one is read by — it carries the label in full whether the crumb is a
              link or the page you're on.
            */}
            <Tooltip>
              <TooltipTrigger asChild>
                {isLast || !crumb.to ? (
                  <span
                    className={cn(
                      'max-w-32 truncate',
                      isLast && 'font-medium text-foreground',
                    )}
                  >
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    to={crumb.to}
                    className="max-w-32 truncate transition-colors hover:text-foreground"
                  >
                    {crumb.label}
                  </Link>
                )}
              </TooltipTrigger>
              <TooltipContent>{crumb.label}</TooltipContent>
            </Tooltip>
          </span>
        )
      })}
    </nav>
  )
}
