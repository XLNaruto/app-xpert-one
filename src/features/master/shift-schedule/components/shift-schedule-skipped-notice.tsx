import { Link } from '@tanstack/react-router'
import { AlertTriangle, X } from 'lucide-react'
import type { ScheduleGenerateResult } from '../types'

const people = (count: number) => `${count} ${count === 1 ? 'employee' : 'employees'}`

/**
 * The part of a Generate answer a toast can't carry: who was left out and why.
 * Employees with no shift have nothing to generate from; employees on a flexible
 * week-off have no fixed days to lay down, so a manager picks them on the grid.
 */
export function ShiftScheduleSkippedNotice({
  result,
  onDismiss,
}: {
  result: ScheduleGenerateResult
  onDismiss: () => void
}) {
  return (
    <div className="relative mb-4 space-y-1.5 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 pr-10 text-sm text-warning">
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onDismiss}
        className="absolute right-2 top-2 grid size-7 cursor-pointer place-items-center rounded-md hover:bg-warning/15"
      >
        <X className="size-4" />
      </button>
      {result.skippedNoShift.length > 0 && (
        <p className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            {people(result.skippedNoShift.length)} had no shift on some dates, so nothing was
            generated for them. Give them a shift on the company's Shift tab or on{' '}
            <Link to="/hr/employee" className="font-medium underline underline-offset-2">
              the employee's shift assignment
            </Link>
            , then generate again.
          </span>
        </p>
      )}
      {result.skippedFlexible.length > 0 && (
        <p className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            {people(result.skippedFlexible.length)} are on a flexible week-off, so their
            off-days must be picked on the grid. Until then attendance and salary credit
            their off-days from the days not worked.
          </span>
        </p>
      )}
    </div>
  )
}
