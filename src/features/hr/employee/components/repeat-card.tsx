import type { ReactNode } from 'react'
import { Plus, Trash2, type LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { FormSection } from '@/components/common/form-section'
import { cn } from '@/lib/utils'

/**
 * The repeatable-card list every multi-row step wears.
 *
 * Rows are laid out as cards of inline fields rather than a table with an
 * add/edit dialog: these steps are filled in *while* the employee's paperwork is
 * on the desk, so all of it wants to be visible and typeable at once. A dialog per
 * row would mean open-fill-close for every family member and every certificate.
 *
 * The API is still one call per row — there's no whole-step endpoint — so the
 * step's Save button diffs the list and issues the calls itself (see
 * `lib/save-rows.ts`). The card UI is a view over that, not a different contract.
 *
 * `Add` appears at the top *and* the bottom, because a long list otherwise makes
 * you scroll back up to add the next row.
 */
export function RepeatSection({
  icon,
  title,
  description,
  count,
  addLabel,
  onAdd,
  /** Controls that belong beside the header — a toggle, typically. */
  headerExtra,
  /** Hide the list and both Add buttons (an "is fresher" switch, say). */
  collapsed = false,
  collapsedMessage,
  /** Drop the heading's top margin when this is the first block on a tab. */
  first = false,
  children,
}: {
  icon: LucideIcon
  title: string
  description?: string
  count: number
  addLabel: string
  onAdd: () => void
  headerExtra?: ReactNode
  collapsed?: boolean
  collapsedMessage?: string
  first?: boolean
  children: ReactNode
}) {
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <FormSection
          icon={icon}
          title={title}
          description={description ?? `${count} ${count === 1 ? 'entry' : 'entries'}`}
          className={cn('flex-1', first && 'mt-0')}
        />
        <div className="flex items-center gap-3">
          {headerExtra}
          {!collapsed && (
            <Button type="button" size="sm" variant="secondary" onClick={onAdd}>
              <Plus className="size-4" />
              {addLabel}
            </Button>
          )}
        </div>
      </div>

      {collapsed ? (
        <p className="mt-5 rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
          {collapsedMessage}
        </p>
      ) : (
        <>
          <div className="mt-5 space-y-4">{children}</div>

          {count > 0 && (
            <div className="mt-4 flex justify-end">
              <Button type="button" size="sm" variant="secondary" onClick={onAdd}>
                <Plus className="size-4" />
                {addLabel}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/**
 * One row of a {@link RepeatSection}: a numbered header strip with a summary and a
 * bin, over a grid of inline fields.
 *
 * The strip turns red-tinted when the row holds an error, so a failed save points
 * at the card that caused it rather than only marking the field — on a list of
 * eight rows the field marker alone is easy to scroll past.
 *
 * `canRemove` is false for the last remaining row: an empty list and a list of one
 * blank row mean the same thing to the API, and keeping one row means the fields
 * are always there to type into.
 */
export function RepeatCard({
  index,
  title,
  badge,
  hasError = false,
  onRemove,
  canRemove = true,
  gridClassName,
  children,
}: {
  /** Zero-based; displayed 1-based. */
  index: number
  title: string
  badge?: ReactNode
  hasError?: boolean
  onRemove: () => void
  canRemove?: boolean
  /**
   * Replaces the default column counts when a card's fields have uneven widths —
   * a switch next to three inputs fits one row only with an explicit template.
   */
  gridClassName?: string
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border transition-colors',
        hasError ? 'border-destructive/40' : 'border-border',
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between gap-3 border-b px-4 py-2.5',
          hasError
            ? 'border-destructive/30 bg-destructive/5'
            : 'border-border bg-muted/40',
        )}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={cn(
              'grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold',
              hasError
                ? 'bg-destructive/15 text-destructive'
                : 'bg-primary/10 text-primary',
            )}
          >
            {index + 1}
          </span>
          <span className="truncate text-sm font-medium text-foreground">{title}</span>
          {badge}
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={canRemove ? `Remove entry ${index + 1}` : 'At least one entry'}
              onClick={onRemove}
              disabled={!canRemove}
              className={cn(
                'grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors',
                canRemove
                  ? 'cursor-pointer hover:bg-destructive/10 hover:text-destructive'
                  : 'cursor-not-allowed opacity-40',
              )}
            >
              <Trash2 className="size-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            {canRemove ? 'Remove' : 'Keep at least one entry'}
          </TooltipContent>
        </Tooltip>
      </div>

      <div
        className={cn(
          'grid gap-x-5 gap-y-4 p-4',
          gridClassName ??
            'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
        )}
      >
        {children}
      </div>
    </div>
  )
}

/** A status pill for a card's header strip. */
export function RepeatCardBadge({
  children,
  variant = 'secondary',
}: {
  children: ReactNode
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'destructive'
}) {
  return (
    <Badge variant={variant} className="shrink-0 text-[10px] uppercase">
      {children}
    </Badge>
  )
}
