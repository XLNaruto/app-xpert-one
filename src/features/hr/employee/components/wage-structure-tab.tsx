import type { ReactNode } from 'react'
import {
  BadgeIndianRupee,
  Building2,
  IndianRupee,
  Info,
  Landmark,
  Plus,
  UserPen,
  Wallet,
} from 'lucide-react'
import { StepNavFooter } from './step-nav-footer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { EmptyState } from '@/components/common/empty-state'
import { FormSection } from '@/components/common/form-section'
import { Forbidden } from '@/features/error'
import { PERMISSIONS, useResourceAccess } from '@/features/permissions'
import { formatAmount, formatDecimal } from '@/lib/currency'
import { WageStructureGrid, formatMonth } from '@/features/master/designation'
import { useAllowanceDeductions } from '@/features/master/allowance-deduction'
import { useEmployeeWageForm } from '../hooks/use-employee-wage-form'
import type { EmployeeWage, EmployeeWageVersion } from '../types'

/**
 * Step 3 — Wage Structure, over two tiers.
 *
 * An employee is priced by their designation's template unless they have a wage
 * of their own, and this screen is both halves of that: the block at the top is
 * whichever tier won, and the grid below it is the employee's own versions —
 * drafted, corrected and withdrawn there.
 *
 * That grid is the designation master's own, not a copy of it. An override is a
 * wage structure a tier up — the same forty columns, the same effective-dated
 * versioning — so it is configured on the same component, driven by a form hook
 * of the same shape against the employee's endpoints. The one thing it doesn't
 * carry is the allowance / deduction columns: the head catalog is always the
 * designation's, so those sit read-only below the grid instead.
 */
export function WageStructureTab({
  employeeId,
  onContinue,
  onBack,
}: {
  employeeId: number
  onContinue: () => void
  onBack: () => void
}) {
  const { canCreate, canUpdate, canDelete } = useResourceAccess(PERMISSIONS.employees)
  const form = useEmployeeWageForm(employeeId)

  /*
   * The wage sends `pay_component_id` without the head's name, so the names are
   * resolved against the allowance / deduction master — the same master the
   * designation's structure was built from.
   */
  const heads = useAllowanceDeductions()
  const headNames = new Map(
    (heads.data?.items ?? []).map((head) => [head.id, head.name]),
  )

  if (form.isForbidden) {
    return <Forbidden description={form.forbiddenMessage} />
  }

  if (form.historyLoading) {
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  const wage = form.wage

  if (!wage) {
    return (
      <EmptyState
        icon={Wallet}
        title="No wage to show"
        description="Couldn't read what this employee is paid. Check they have a current posting, then try again."
      />
    )
  }

  const savedCount = form.existing.length
  /* A row opened for correction is one of the saved entries, not an extra one —
     it's already counted above, so only genuinely new rows add to the total. */
  const editingCount = form.fields.filter(
    (field) => field.wageStructureId !== undefined,
  ).length
  const newCount = form.fields.length - editingCount
  const isEmpty = savedCount === 0 && form.fields.length === 0

  return (
    <div className="space-y-6">
      <SourceBanner wage={wage} />

      {wage.effectiveWage ? (
        <EffectiveWageBlock wage={wage} />
      ) : (
        <EmptyState
          icon={Wallet}
          title="Nothing prices this employee yet"
          description="Neither this employee nor their designation has a wage structure in force. Set one on the designation, or give this employee their own below."
        />
      )}

      {/* ── The employee's own versions, on the designation master's own grid ── */}
      <form onSubmit={form.onSubmit} noValidate>
        <div className="rounded-xl border border-border">
          {/* ── Header ── */}
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <IndianRupee className="size-4" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Employee's Own Wage
                </h3>
                <p className="text-xs text-muted-foreground">
                  Each row is an effective month — it applies from that month onward
                  and outranks the designation. Add a row to revise the pay; use the
                  pencil to correct a saved one, the bin to withdraw it.
                </p>
              </div>
            </div>
            {canCreate && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={form.addRow}
                className="ml-auto"
              >
                <Plus className="size-4" />
                Add Row
              </Button>
            )}
          </div>

          {/*
            Flush against the card — the grid brings its own gridlines and a pinned
            header, so padding here would only float it off the edges. With nothing
            saved and nothing drafted there is no grid to draw: a header row over an
            empty body reads as a table that failed to load, where a line saying the
            employee is on their designation's terms is the actual state.
          */}
          {isEmpty ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              No wage of their own — this employee is paid on their designation's
              terms.
              {canCreate && ' Add a row to price them separately.'}
            </p>
          ) : (
            <WageStructureGrid
              form={{
                ...form,
                /* The pencil is an update and the bin a delete, so each appears
                   only for someone who holds that action. */
                editRow: canUpdate ? form.editRow : () => {},
                deleteRow: canDelete ? form.setPendingRemoval : undefined,
              }}
            />
          )}

          {/* ── Footer ── */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{savedCount} saved</span>,{' '}
              <span className="font-medium text-primary">{newCount} new</span>
              {editingCount > 0 && (
                <>
                  {', '}
                  <span className="font-medium text-primary">
                    {editingCount} being corrected
                  </span>
                </>
              )}
            </p>
            {canCreate && (
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={form.addRow}>
                  <Plus className="size-4" />
                  Add Row
                </Button>
                {/* Nothing on the grid to save — the saved versions alone are
                    nothing to send. */}
                <Button
                  type="submit"
                  size="sm"
                  disabled={form.isPending || form.fields.length === 0}
                >
                  {form.isPending ? 'Saving…' : 'Save Wage'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </form>

      {/* ── Statutory compliance, off whichever tier is in force ── */}
      {wage.effectiveWage && <ActsBlock version={wage.effectiveWage} />}

      {/*
        Rendered even when the structure carries no heads: an absent section reads
        as a screen that forgot to load them, where two "None on this structure"
        cards say plainly that the designation attached none.
      */}
      <div>
        <FormSection
          icon={Wallet}
          title="Allowances & Deductions"
          description="From the designation — an employee's own wage carries no heads of its own, which is why the grid above has no head columns."
        />

        <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ComponentTable
            title="Allowances"
            rows={wage.salaryComponents.filter(
              (component) => component.componentType.toLowerCase() === 'allowance',
            )}
            headNames={headNames}
          />
          <ComponentTable
            title="Deductions"
            rows={wage.salaryComponents.filter(
              (component) => component.componentType.toLowerCase() !== 'allowance',
            )}
            headNames={headNames}
          />
        </div>
      </div>

      <StepNavFooter onContinue={onContinue} onBack={onBack}>
        Save the grid before moving on — rows left on it aren't carried to the next
        step.
      </StepNavFooter>

      <ConfirmDialog
        open={form.pendingRemoval !== null}
        onOpenChange={(open) => !open && form.setPendingRemoval(null)}
        variant="destructive"
        title="Withdraw this wage version?"
        description={
          form.pendingRemoval
            ? savedCount === 1
              ? `Removes the override effective ${formatMonth(form.pendingRemoval.effectiveFrom)}. This employee goes back to their designation's wage structure.`
              : `Removes the version effective ${formatMonth(form.pendingRemoval.effectiveFrom)}. The version before it prices the months after its own date again.`
            : undefined
        }
        confirmLabel="Withdraw"
        loading={form.isRemoving}
        keepOpenOnConfirm
        onConfirm={form.confirmRemoval}
      />
    </div>
  )
}

/* ── The two tiers ──────────────────────────────────────────────────────── */

/** Which tier priced this employee, and what that means for editing them. */
function SourceBanner({ wage }: { wage: EmployeeWage }) {
  const isOwn = wage.source === 'EMPLOYEE'

  return (
    <p className="flex items-start gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
      <Info className="mt-0.5 size-4 shrink-0 text-primary" />
      <span>
        {isOwn ? (
          <>
            This employee is on <strong>their own wage</strong>, which outranks their
            designation's structure. Withdraw every version below to put them back on
            the designation's terms.
          </>
        ) : (
          <>
            This employee is priced by <strong>their designation's</strong> wage
            structure. Revise it from Master → Designation to move everyone on that
            title, or add a row below to move only this employee.
          </>
        )}
      </span>
    </p>
  )
}

/** The wage in force — whichever tier won, drawn the same either way. */
function EffectiveWageBlock({ wage }: { wage: EmployeeWage }) {
  const version = wage.effectiveWage as EmployeeWageVersion
  const isOwn = wage.source === 'EMPLOYEE'
  const isDaily = version.salaryType === 'Daily'

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <FormSection
          icon={BadgeIndianRupee}
          title="Salary In Force"
          description={`Effective from ${formatMonth(version.effectiveFrom)}`}
          className="mt-0"
        />
        <Badge
          variant={isOwn ? 'success' : 'secondary'}
          className="ml-auto shrink-0 gap-1"
        >
          {isOwn ? <UserPen className="size-3" /> : <Building2 className="size-3" />}
          {isOwn ? "Employee's own" : 'From designation'}
        </Badge>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ReadOnlyTile label="Salary Type" value={version.salaryType} />
        <ReadOnlyTile
          label="Basic Pay (Monthly)"
          value={money(version.basicPay)}
          emphasis={!isDaily}
        />
        <ReadOnlyTile
          label="Wage Per Day"
          value={money(version.wagePerDay)}
          emphasis={isDaily}
        />
        <ReadOnlyTile
          label="Working Days"
          value={
            version.workingDayCalculationType === 'Fixed'
              ? (version.workingDays ?? '—')
              : (version.workingDayCalculationType ?? '—')
          }
        />
        <ReadOnlyTile label="Weekly Off" value={version.weeklyOff ?? 'None'} />
        <ReadOnlyTile
          label="Extra Day Amount"
          value={money(version.extraDayAmountPerDay)}
        />
        <ReadOnlyTile
          label="Overtime"
          value={
            version.overtimeApplicable
              ? version.overtimeRatePerHour === null
                ? 'Applicable'
                : `${formatAmount(version.overtimeRatePerHour)} / hour`
              : 'Not applicable'
          }
        />
        <ReadOnlyTile
          label="On Overtime"
          value={
            version.overtimeApplicable
              ? ([
                  version.pfApplicableOnOvertime ? 'PF' : null,
                  version.esicApplicableOnOvertime ? 'ESIC' : null,
                  version.ptApplicableOnOvertime ? 'PT' : null,
                ]
                  .filter(Boolean)
                  .join(', ') || 'No deductions')
              : '—'
          }
        />
      </div>
    </div>
  )
}

/** Which acts apply to the wage in force, and on what basis. */
function ActsBlock({ version }: { version: EmployeeWageVersion }) {
  return (
    <div>
      <FormSection
        icon={Landmark}
        title="Statutory Compliance"
        description="Which acts apply on the wage in force, and on what basis"
      />

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ActTile
          label="Provident Fund"
          applicable={version.pfActApplicable}
          detail={pfDetail(version)}
        />
        <ActTile
          label="ESIC"
          applicable={version.esicActApplicable}
          detail={version.esicDeductionBasis ?? undefined}
        />
        <ActTile
          label="Professional Tax"
          applicable={version.ptActApplicable}
          detail={actAmountDetail(version.ptActType, version.ptAmount)}
        />
        <ActTile
          label="Labour Welfare Fund"
          applicable={version.lwfActApplicable}
          detail={[
            actAmountDetail(version.lwfActType, version.lwfAmount),
            version.lwfDeductFromWages ? 'recovered from wages' : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        />
        <ActTile
          label="TDS"
          applicable={version.tdsActApplicable}
          detail={
            version.tdsPercentage === null
              ? undefined
              : `${formatDecimal(version.tdsPercentage)}%`
          }
        />
      </div>
    </div>
  )
}

/* ── Small pieces ───────────────────────────────────────────────────────── */

/** An amount, or an em dash where the version carries none. */
function money(value: number | null): string {
  return value === null ? '—' : formatAmount(value)
}

/** "12% of EPF wages", or the flat amount when PF is deducted at a fixed rate. */
function pfDetail(version: EmployeeWageVersion): string | undefined {
  if (!version.pfActApplicable || version.pfValue === null) return undefined
  const onLimit = version.employeePfContributionOnWageLimit ? ' on wage ceiling' : ''
  return version.pfValueType === 'Percentage'
    ? `${formatDecimal(version.pfValue)}%${onLimit}`
    : `${formatAmount(version.pfValue)}${onLimit}`
}

/** "As Per Act", or the hand-entered amount when the act is set manually. */
function actAmountDetail(
  actType: string | null,
  amount: number | null,
): string | undefined {
  if (!actType) return amount === null ? undefined : formatAmount(amount)
  if (actType === 'Manual' && amount !== null) {
    return `Manual · ${formatAmount(amount)}`
  }
  return actType
}

/** One value in force, drawn as a read-only tile rather than a disabled input. */
function ReadOnlyTile({
  label,
  value,
  emphasis = false,
}: {
  label: string
  value: ReactNode
  emphasis?: boolean
}) {
  return (
    <Card className={emphasis ? 'border-primary/40 bg-primary/5' : undefined}>
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
      </CardContent>
    </Card>
  )
}

/** One act: whether it applies, and on what basis when it does. */
function ActTile({
  label,
  applicable,
  detail,
}: {
  label: string
  applicable: boolean
  detail?: string
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {applicable ? detail || 'Applicable' : 'Not applicable'}
          </p>
        </div>
        <Badge variant={applicable ? 'success' : 'secondary'}>
          {applicable ? 'Yes' : 'No'}
        </Badge>
      </CardContent>
    </Card>
  )
}

/** Allowance or deduction heads, with which acts each one counts toward. */
function ComponentTable({
  title,
  rows,
  headNames,
}: {
  title: string
  rows: EmployeeWage['salaryComponents']
  /** `pay_component_id` → the head's name, from the allowance / deduction master. */
  headNames: Map<number, string>
}) {
  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="mt-1 text-xs text-muted-foreground">None on this structure.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-medium text-foreground">{title}</p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Head</TableHead>
                <TableHead className="whitespace-nowrap">Value</TableHead>
                <TableHead className="whitespace-nowrap">Counts toward</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((component) => {
                const acts = [
                  component.pfApplicable ? 'PF' : null,
                  component.esicApplicable ? 'ESIC' : null,
                  component.ptApplicable ? 'PT' : null,
                ].filter(Boolean)

                return (
                  <TableRow key={component.payComponentId}>
                    <TableCell className="whitespace-nowrap">
                      {headNames.get(component.payComponentId) ??
                        `Head #${component.payComponentId}`}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {component.amountType.toLowerCase() === 'percentage'
                        ? `${formatDecimal(component.amount)}%`
                        : formatAmount(component.amount)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {acts.length ? acts.join(', ') : '—'}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
