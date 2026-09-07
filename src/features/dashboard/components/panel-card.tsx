import type { ReactNode } from 'react'
import { AlertTriangle, Inbox } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { getApiErrorMessage } from '@/lib/api-error'
import { cn } from '@/lib/utils'

/**
 * The shell every panel on the dashboard wears, and the three states it can be
 * in besides "drawn".
 *
 * **Skeletons are PER PANEL, never page-level.** All six requests fire in
 * parallel and each resolves independently — `/summary` is the fast one and the
 * tiles paint first, which is the whole reason not to gate the page on one
 * spinner.
 *
 * **A refetch does not re-skeleton.** A filter change is a new cache key, so the
 * panels would otherwise blank and the layout would jump; the previous render is
 * held at reduced opacity instead (the query hooks keep it with
 * `keepPreviousData`).
 *
 * **A 400 is shown IN PLACE, not as a toast.** The two 400s this API produces —
 * an impossible measure/dimension pair, and `leave_days` on the weekday/hour
 * grid — come back with a message naming the valid options, and that message is
 * only useful next to the control that caused it.
 */

interface PanelCardProps {
  title: string
  /** One line under the title — where a metric's caveat belongs. */
  description?: string
  /** Panel-local controls: a measure picker, a chart-shape toggle. */
  actions?: ReactNode
  /** True only on the FIRST load — a later refetch dims instead. */
  isLoading?: boolean
  /** True while a refetch is in flight over content already on screen. */
  isFetching?: boolean
  error?: unknown
  /** Rendered instead of the children when the response carried no data. */
  isEmpty?: boolean
  emptyTitle?: string
  emptyDescription?: string
  /** Height the skeleton reserves, so the panel doesn't resize on load. */
  skeletonHeight?: number
  className?: string
  children: ReactNode
}

export function PanelCard({
  title,
  description,
  actions,
  isLoading = false,
  isFetching = false,
  error,
  isEmpty = false,
  emptyTitle = 'No data yet',
  emptyDescription,
  skeletonHeight = 280,
  className,
  children,
}: PanelCardProps) {
  return (
    <Card className={cn('flex flex-col overflow-hidden', className)}>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 pb-3">
        <div className="min-w-0">
          <h3 className="font-heading text-base font-semibold leading-tight">{title}</h3>
          {description ? (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </CardHeader>

      {/*
        A column flex that CENTRES what it holds, which matters only for the
        panels that don't fill their row.

        Every row of the dashboard grid is as tall as its tallest panel, and the
        pairs are uneven by nature: a breakdown carries a chart AND a slice
        table, while the punch grid is seven rows of cells. Top-aligned, that
        difference collects as dead white at the bottom of the shorter card and
        reads as a panel that failed to finish drawing. Centred, the shorter
        content sits in the middle of its card and the space becomes margin.

        For a panel that IS the tallest in its row there is nothing to
        distribute, so this changes nothing about how it draws.
      */}
      <CardContent className="flex flex-1 flex-col justify-center px-5 pb-5 pt-0">
        {isLoading ? (
          <Skeleton style={{ height: skeletonHeight }} className="w-full" />
        ) : error ? (
          <PanelError error={error} />
        ) : isEmpty ? (
          <PanelEmpty title={emptyTitle} description={emptyDescription} />
        ) : (
          <div
            className={cn(
              'transition-opacity duration-200',
              isFetching && 'pointer-events-none opacity-60',
            )}
          >
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * The panel's own failure. The server's message is shown verbatim because for
 * the 400s it names the dimensions or metrics that ARE accepted, and paraphrasing
 * that into "something went wrong" throws the only useful part away.
 */
function PanelError({ error }: { error: unknown }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
      <p className="whitespace-pre-line text-sm text-destructive">
        {getApiErrorMessage(error, "Couldn't load this panel.")}
      </p>
    </div>
  )
}

/**
 * No data — which on this API is a valid answer, not a failure.
 *
 * A COMPANY-scoped user with no companies granted, and a brand-new account with
 * no employees, both get valid responses full of zeroes and nulls.
 */
function PanelEmpty({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <div className="rounded-full bg-muted p-2.5">
        <Inbox className="size-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">{title}</p>
      {description ? (
        <p className="max-w-sm text-xs text-muted-foreground">{description}</p>
      ) : null}
    </div>
  )
}
