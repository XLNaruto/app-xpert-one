import { Link } from '@tanstack/react-router'
import { CircleSlash, FileSignature } from 'lucide-react'
import { encryptParams } from '@/lib/crypto'
import { cn } from '@/lib/utils'
import { Hint } from '@/components/common/hint'
import { RowActionsMenu, type RowAction } from '@/components/common/row-actions-menu'
import { CONTRACT_STATUS_SPECS } from '../constants'
import {
  EM_DASH,
  formatDay,
  formatDaysToEnd,
  formatPlacement,
  formatTerm,
} from '../lib/contract-format'
import type { ExpiringContract } from '../types'

/**
 * The pieces a contract row is made of, shared by the full screen and the
 * dashboard card so the two never drift into describing the same row
 * differently.
 */

/** The status chip: amber for due, red for expired, grey for upcoming. */
export function ContractStatusChip({ row }: { row: ExpiringContract }) {
  const spec = CONTRACT_STATUS_SPECS[row.status]
  return (
    <Hint text={spec.description}>
      <span
        className={cn(
          'inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium',
          spec.className,
        )}
      >
        {spec.label}
      </span>
    </Hint>
  )
}

/**
 * The employee, linked to their record. `from: 'dashboard'` is what makes Back
 * over there return to where the reader actually came from.
 */
export function ContractEmployeeCell({
  row,
  from = 'contract-expiry',
}: {
  row: ExpiringContract
  from?: string
}) {
  return (
    <div className="min-w-0">
      <Link
        to="/hr/employee/detail"
        search={{ data: encryptParams({ id: row.employeeId, from }) }}
        className="truncate font-medium text-primary hover:underline"
      >
        {row.employeeName ?? `Employee #${row.employeeId}`}
      </Link>
      <p className="truncate text-xs text-muted-foreground">
        {[row.employeeCode, row.employeeMobile].filter(Boolean).join(' · ') || EM_DASH}
      </p>
    </div>
  )
}

/** Where they are posted — null levels are skipped, not dashed. */
export function ContractPlacementCell({ row }: { row: ExpiringContract }) {
  return (
    <div className="min-w-0 text-xs">
      <p className="truncate">{formatPlacement(row)}</p>
      <p className="truncate text-muted-foreground">
        {[formatTerm(row.contractPeriod, row.contractPeriodType), row.grade]
          .filter(Boolean)
          .join(' · ')}
      </p>
    </div>
  )
}

/**
 * When the term ends, and how far off that is.
 *
 * `contractEndsOn` is rendered as it arrived — never recomputed from the joining
 * date and the period, which after a renewal names the term that was replaced.
 */
export function ContractDatesCell({ row }: { row: ExpiringContract }) {
  const overdue = (row.daysToEnd ?? 0) < 0
  return (
    <div className="whitespace-nowrap text-xs">
      <p>Ends {formatDay(row.contractEndsOn)}</p>
      <p className={cn(overdue ? 'font-medium text-destructive' : 'text-muted-foreground')}>
        {formatDaysToEnd(row.daysToEnd)}
      </p>
    </div>
  )
}

/**
 * The two actions, collapsed behind the shared "Actions" menu so the column
 * reads the same as every other list screen. Rendered only for a role holding
 * `employees:update` — the list itself is readable on `dashboard:read` alone,
 * and offering a button that can only answer 403 is worse than not offering it.
 */
export function ContractRowActions({
  row,
  canUpdate,
  onRenew,
  onComplete,
}: {
  row: ExpiringContract
  canUpdate: boolean
  onRenew: (row: ExpiringContract) => void
  onComplete: (row: ExpiringContract) => void
}) {
  if (!canUpdate) return <span className="text-xs text-muted-foreground">{EM_DASH}</span>

  const actions: RowAction[] = [
    {
      label: 'Update Contract',
      icon: FileSignature,
      onSelect: () => onRenew(row),
    },
    {
      label: 'Not Renewed',
      icon: CircleSlash,
      onSelect: () => onComplete(row),
      destructive: true,
      separated: true,
    },
  ]

  return <RowActionsMenu actions={actions} />
}
