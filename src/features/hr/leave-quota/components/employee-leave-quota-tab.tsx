import { useState, type ReactNode } from 'react'
import { CalendarDays, Info } from 'lucide-react'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { Forbidden } from '@/features/error'
import { PERMISSIONS, useResourceAccess } from '@/features/permissions'
import { FormSection } from '@/components/common/form-section'
import { Field } from '@/components/common/form-field'
import { YearPicker } from '@/components/ui/year-picker'
import { LeaveBalanceCard, useLeaveBalance } from '@/features/hr/leave'
import {
  useEmployeeLeaveQuotas,
  useSaveEmployeeLeaveQuotas,
} from '../api/use-leave-quotas'
import { useLeaveQuotaGrid } from '../hooks/use-leave-quota-grid'
import { LeaveQuotaGrid } from './leave-quota-grid'

/**
 * One employee's paid-leave allowance for a year — **the exception, not the rule.**
 *
 * The designation's standing policy is where an allowance normally lives; a row
 * here overrides it for this employee and THIS YEAR only, and clearing a cell hands
 * the type back to the designation. So every empty cell shows the number it is
 * inheriting rather than looking unset.
 *
 * The balance card sits above the grid because the two answer each other: the grid
 * is what was granted, the card is what is left of it.
 *
 * Gated on `leaves:read` / `leaves:update` — it is the employee's leave that is
 * being granted, not the designation's policy.
 */
export function EmployeeLeaveQuotaTab({
  employeeId,
  footer,
}: {
  employeeId: number
  /**
   * Step navigation, when the tab is mounted inside the employee wizard. Passed in
   * rather than imported so this module stays independent of the wizard it happens
   * to sit in.
   */
  footer?: ReactNode
}) {
  const { canView, canUpdate } = useResourceAccess(PERMISSIONS.leaves)

  /*
   * The grant is per calendar year, so the year is the screen's first control.
   * It opens on the current one — the year a desk is almost always working in.
   */
  const [year, setYear] = useState(() => String(new Date().getFullYear()))
  const numericYear = Number(year) || new Date().getFullYear()

  const quotas = useEmployeeLeaveQuotas(employeeId, numericYear)
  const saveQuotas = useSaveEmployeeLeaveQuotas(employeeId, numericYear)
  const balance = useLeaveBalance(employeeId, numericYear)

  const grid = useLeaveQuotaGrid({
    items: quotas.data?.items,
    // A different year is a different grid — the draft belongs to the old one.
    scope: `${employeeId}:${numericYear}`,
    save: (rows, handlers) => saveQuotas.mutate(rows, handlers),
    isSaving: saveQuotas.isPending,
    canUpdate,
  })

  if (!canView || isForbiddenError(quotas.error)) {
    return <Forbidden description={getApiErrorMessage(quotas.error)} />
  }

  if (quotas.isError) {
    return (
      <p className="text-sm text-destructive">
        {getApiErrorMessage(quotas.error, "Couldn't load the leave allowances.")}
      </p>
    )
  }

  const hasDesignation = quotas.data ? quotas.data.designationId !== null : true

  return (
    <div>
      <FormSection
        icon={CalendarDays}
        title="Leave Allowance"
        description="Paid days per year for this employee — an exception to the designation's policy"
        className="mt-0"
      />

      <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Field
          label="Year"
          hint="Allowances are granted per calendar year. Saving here touches this year only."
        >
          <YearPicker value={year} onChange={(next) => setYear(next || year)} />
        </Field>
      </div>

      {/*
        With no designation behind them, every empty cell falls to NONE — i.e. no
        paid days at all — so the grid's placeholders would all read "none" with no
        explanation of why.
      */}
      {!hasDesignation && (
        <p className="mt-4 flex items-start gap-2 rounded-lg bg-warning/10 p-3 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-warning" />
          <span>
            This employee has no designation on an open posting, so there is no
            policy to fall back on — any leave type left empty below has no paid
            days at all.
          </span>
        </p>
      )}

      <div className="mt-5">
        <LeaveQuotaGrid
          rows={quotas.data?.items ?? []}
          grid={grid}
          isLoading={quotas.isLoading}
          fallbackLabel={
            quotas.data?.designationName
              ? `If empty (from ${quotas.data.designationName})`
              : 'If empty'
          }
          footerNote={
            'Leave a box empty to hand the type back to the designation. A typed 0 is different — it grants no paid days of that type for this year. Saving replaces this year\'s whole grid; other years are untouched.'
          }
        />
      </div>

      <div className="mt-6">
        <LeaveBalanceCard balance={balance.data} isLoading={balance.isLoading} />
      </div>

      {footer}
    </div>
  )
}
