import { Info, Infinity as InfinityIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { EmptyState } from '@/components/common/empty-state'
import { CalendarDays } from 'lucide-react'
import type { LeaveQuotaRow } from '../types'
import type { useLeaveQuotaGrid } from '../hooks/use-leave-quota-grid'

/**
 * The paid-allowance grid — one editable cell per leave type. Shared by the
 * designation's standing policy and the employee's per-year grant; the only
 * difference between the two is whether a row carries a fallback to show, which
 * this reads off the row itself.
 *
 * Three things the grid is careful to render as three DIFFERENT states, because
 * they all look like "nothing" and mean different things:
 *
 * - **Unlimited** — an UNPAID leave type. Read-only, no input: it is unpaid from
 *   day one, so there is no allowance to set and the API refuses a row for it.
 * - **Empty with a fallback** — nothing set here, so the tier below applies. The
 *   placeholder shows the inherited number and where it came from.
 * - **Empty with no fallback** — nothing configured anywhere, so every day of that
 *   type is unpaid. Said outright, never as "unlimited".
 *
 * And a typed **`0`** is none of those: it is a stored "no paid days of this type",
 * which is why the input keeps `0` and empty apart.
 */
export function LeaveQuotaGrid({
  rows,
  grid,
  isLoading,
  /** Shown under the last column's header — what an empty cell falls back to. */
  fallbackLabel,
  footerNote,
}: {
  rows: LeaveQuotaRow[]
  grid: ReturnType<typeof useLeaveQuotaGrid>
  isLoading: boolean
  fallbackLabel?: string
  footerNote?: string
}) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-11 w-full" />
        ))}
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="No leave types yet"
        description="Add leave types to the master first — an allowance is set per type."
      />
    )
  }

  const showFallback = rows.some((row) => row.fallbackSource !== undefined)

  return (
    <div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Leave Type</TableHead>
              <TableHead className="w-56">Paid days per year</TableHead>
              {showFallback && <TableHead>{fallbackLabel ?? 'Falls back to'}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.leaveTypeId}>
                <TableCell className="font-medium text-foreground">
                  {row.leaveType || '—'}
                  {row.shortCode && (
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      ({row.shortCode})
                    </span>
                  )}
                </TableCell>

                <TableCell>
                  {row.unlimited ? (
                    /*
                      An unpaid type: read-only on purpose. Every day of it is
                      unpaid from the start, so there is no allowance to set — and
                      including it in a save answers
                      "These leave types are unpaid and have no paid allowance to
                      set: LWP".
                    */
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex cursor-help">
                          <Badge variant="secondary">
                            <InfinityIcon className="mr-1 size-3" />
                            Unlimited
                          </Badge>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-64 text-pretty font-normal">
                        An unpaid leave type — unpaid from day one, so there is no
                        paid allowance to set for it.
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <QuotaCell row={row} grid={grid} />
                  )}
                </TableCell>

                {showFallback && (
                  <TableCell>
                    <FallbackCell row={row} />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p className="max-w-xl text-xs text-muted-foreground">
          {footerNote ??
            'Leave a box empty to set nothing here. A typed 0 is different — it stores "no paid days of this type".'}
        </p>

        {!grid.isReadOnly && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={grid.reset}
              disabled={!grid.isDirty || grid.isSaving}
            >
              Discard changes
            </Button>
            <Button
              type="button"
              onClick={grid.onSave}
              disabled={grid.isSaving || grid.hasErrors || !grid.isDirty}
            >
              {grid.isSaving ? 'Saving…' : 'Save allowances'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

/** The editable number box, plus the one-click way back to "nothing set here". */
function QuotaCell({
  row,
  grid,
}: {
  row: LeaveQuotaRow
  grid: ReturnType<typeof useLeaveQuotaGrid>
}) {
  const value = grid.draft[row.leaveTypeId] ?? ''
  const error = grid.errorFor(row.leaveTypeId)

  if (grid.isReadOnly) {
    return value === '' ? (
      <span className="text-muted-foreground">Not set</span>
    ) : (
      <span className="font-medium text-foreground">{value}</span>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <Input
          inputMode="numeric"
          className="w-24"
          value={value}
          aria-label={`Paid days per year for ${row.leaveType}`}
          aria-invalid={error ? true : undefined}
          // The placeholder is the inherited number where there is one, so an
          // empty box reads as "this many, from the tier below" rather than blank.
          placeholder={
            row.fallbackSource === undefined
              ? 'e.g. 12'
              : row.fallsBackTo === null
                ? 'none'
                : String(row.fallsBackTo)
          }
          onChange={(event) => grid.setCell(row.leaveTypeId, event.target.value)}
        />
        {value !== '' && (
          <button
            type="button"
            onClick={() => grid.clearCell(row.leaveTypeId)}
            className="cursor-pointer text-xs text-muted-foreground underline-offset-2 transition-colors hover:text-primary hover:underline"
          >
            Clear
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  )
}

/**
 * What applies when the cell above is empty. `NONE` with no number is the reading
 * that gets mistaken for "uncapped", so it says **no paid days** instead.
 */
function FallbackCell({ row }: { row: LeaveQuotaRow }) {
  if (row.unlimited) return <span className="text-muted-foreground">—</span>

  if (row.fallbackSource === 'NONE' || row.fallsBackTo === null) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex cursor-help">
            <Badge variant="destructive">
              <Info className="mr-1 size-3" />
              No paid days
            </Badge>
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-72 text-pretty font-normal">
          Nothing is set here or on the designation, so every day of this type is
          unpaid. It still doesn't stop the employee applying for it.
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <span className="text-sm text-muted-foreground">
      <strong className="font-medium text-foreground">{row.fallsBackTo}</strong> from the
      designation
    </span>
  )
}
