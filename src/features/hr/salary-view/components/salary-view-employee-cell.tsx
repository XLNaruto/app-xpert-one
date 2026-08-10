import { CellTooltip } from '@/components/common/wage-grid-fields'
import { cn } from '@/lib/utils'
import { initialsOf } from '../lib/salary-view-mappers'
import type { SalaryViewRow } from '../types'

/**
 * Who the salary belongs to — the column a reader scans by.
 *
 * The report answers a name and a code but no photo, so the avatar is the
 * person's initials, with the designation under the name since payroll is
 * configured per title.
 *
 * `showCode` is off by default because the short view carries the employee code
 * in its own column, and printing it twice on one row only makes the column
 * beside it look like a repeat. The long view has no such column — one cell
 * carries the whole person there — so it asks for the code.
 */
export function SalaryViewEmployeeCell({
  row,
  className,
  showCode = false,
}: {
  row: SalaryViewRow
  className?: string
  /** Print the employee code under the name — for layouts with no code column. */
  showCode?: boolean
}) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold uppercase text-primary">
        {initialsOf(row.employeeName)}
      </span>
      {/* Both lines truncate — the long view pins this column to a fixed width —
          so both carry the app's tooltip rather than leaving the full value
          unreachable. */}
      <div className="min-w-0 leading-tight">
        <CellTooltip label={row.employeeName || 'Unknown employee'}>
          <span className="block cursor-help truncate font-medium text-foreground">
            {row.employeeName || 'Unknown employee'}
          </span>
        </CellTooltip>
        <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
          {showCode && row.employeeCode && (
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
              #{row.employeeCode}
            </span>
          )}
          {row.designationName && (
            <CellTooltip label={row.designationName}>
              <span className="min-w-0 cursor-help truncate text-[11px] uppercase tracking-wide text-muted-foreground">
                {row.designationName}
              </span>
            </CellTooltip>
          )}
        </span>
      </div>
    </div>
  )
}
