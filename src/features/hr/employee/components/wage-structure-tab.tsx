import type { ReactNode } from 'react'
import { BadgeIndianRupee, Info, Landmark, Wallet } from 'lucide-react'
import { StepNavFooter } from './step-nav-footer'
import { Badge } from '@/components/ui/badge'
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
import { EmptyState } from '@/components/common/empty-state'
import { FormSection } from '@/components/common/form-section'
import { Forbidden } from '@/features/error'
import { isForbiddenError, getApiErrorMessage } from '@/lib/api-error'
import { formatAmount, formatDecimal } from '@/lib/currency'
import { formatDate } from '@/lib/utils'
import { useAllowanceDeductions } from '@/features/master/allowance-deduction'
import { useEmployeeWageStructure } from '../api/use-employee-steps'
import type { EmployeeWageStructure } from '../types'

/**
 * Step 3 — Wage Structure. Read-only, and not because the screen hasn't been
 * finished: the API stores no wage structure per employee at all. What it answers
 * is the structure the employee **inherits** from the designation on their current
 * posting, which is why there is no write endpoint to pair with the read.
 *
 * So the two ways to change an employee's pay are both elsewhere: revise the
 * designation's wage structure (Master → Designation), or move the employee to a
 * different designation (Transfer History). The banner says as much, because a
 * read-only form with no explanation reads as a bug.
 */
export function WageStructureTab({
  employeeId,
  onContinue,
  onClose,
}: {
  employeeId: number
  onContinue: () => void
  onClose: () => void
}) {
  const { data, isLoading, isError, error } = useEmployeeWageStructure(employeeId)

  /*
   * The wage structure sends `pay_component_id` without the head's name, so the
   * names are resolved against the allowance / deduction master — the same master
   * the designation's structure was built from.
   */
  const heads = useAllowanceDeductions()
  const headNames = new Map(
    (heads.data?.items ?? []).map((head) => [head.id, head.name]),
  )

  if (isForbiddenError(error)) {
    return <Forbidden description={getApiErrorMessage(error)} />
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  if (isError || !data) {
    return (
      <EmptyState
        icon={Wallet}
        title="No wage structure yet"
        description={
          error instanceof Error
            ? error.message
            : "This employee's designation has no wage structure in force. Add one on the designation, then come back."
        }
      />
    )
  }

  const isDaily = data.salaryType.toLowerCase() === 'daily'
  const allowances = data.salaryComponents.filter(
    (component) => component.componentType.toLowerCase() === 'allowance',
  )
  const deductions = data.salaryComponents.filter(
    (component) => component.componentType.toLowerCase() !== 'allowance',
  )

  return (
    <div className="space-y-6">
      <p className="flex items-start gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" />
        <span>
          This is inherited from the employee's designation — nothing here is stored
          against the employee, so there's nothing to edit. To change the pay, revise
          the designation's wage structure, or move the employee to another
          designation from <strong>Employee Transfer History</strong>.
        </span>
      </p>

      <div>
        <FormSection
          icon={BadgeIndianRupee}
          title="Salary"
          description={
            data.applicableDate
              ? `In force from ${formatDate(data.applicableDate)}`
              : 'The structure currently in force'
          }
          className="mt-0"
        />

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ReadOnlyTile label="Salary Type" value={data.salaryType || '—'} />
          <ReadOnlyTile
            label="Basic Pay (Monthly)"
            value={data.basicPay === null ? '—' : formatAmount(data.basicPay)}
            emphasis={!isDaily}
          />
          <ReadOnlyTile
            label="Wage Per Day"
            value={data.wagesPerDay === null ? '—' : formatAmount(data.wagesPerDay)}
            emphasis={isDaily}
          />
          <ReadOnlyTile
            label="Working Days"
            value={
              data.workingDays === null
                ? '—'
                : `${data.workingDays} (${data.workingDayCalculationType || 'Fixed'})`
            }
          />
          <ReadOnlyTile label="Weekly Off" value={data.weeklyOff || '—'} />
          <ReadOnlyTile
            label="Extra Day Amount"
            value={
              data.extraDayAmountPerDay === null
                ? '—'
                : formatAmount(data.extraDayAmountPerDay)
            }
          />
          <ReadOnlyTile
            label="Overtime"
            value={
              data.isOvertimeApplicable
                ? data.overtimeRatePerHour === null
                  ? 'Applicable'
                  : `${formatAmount(data.overtimeRatePerHour)} / hour`
                : 'Not applicable'
            }
          />
          <ReadOnlyTile
            label="Disability"
            value={data.isDisability ? 'Recorded' : 'None'}
          />
        </div>
      </div>

      <div>
        <FormSection
          icon={Landmark}
          title="Statutory Compliance"
          description="Which acts apply to this employee, and on what basis"
        />

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ActTile
            label="Provident Fund"
            applicable={data.isPfActApplicable}
            detail={pfDetail(data)}
          />
          <ActTile
            label="ESIC"
            applicable={data.isEsicActApplicable}
            detail={data.esicDeductionBasis || undefined}
          />
          <ActTile
            label="Professional Tax"
            applicable={data.isPtActApplicable}
            detail={actAmountDetail(data.ptActType, data.ptAmount)}
          />
          <ActTile
            label="Labour Welfare Fund"
            applicable={data.isLwfActApplicable}
            detail={actAmountDetail(data.lwfActType, data.lwfAmount)}
          />
          <ActTile label="TDS" applicable={data.isTdsActApplicable} />
          {data.isOvertimeApplicable && (
            <ActTile
              label="On overtime"
              applicable
              detail={
                [
                  data.isPfApplicableOnOvertime ? 'PF' : null,
                  data.isEsicApplicableOnOvertime ? 'ESIC' : null,
                  data.isPtApplicableOnOvertime ? 'PT' : null,
                ]
                  .filter(Boolean)
                  .join(', ') || 'None'
              }
            />
          )}
        </div>
      </div>

      {data.salaryComponents.length > 0 && (
        <div>
          <FormSection
            icon={Wallet}
            title="Allowances & Deductions"
            description="The heads attached to this wage structure"
          />

          <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ComponentTable title="Allowances" rows={allowances} headNames={headNames} />
            <ComponentTable title="Deductions" rows={deductions} headNames={headNames} />
          </div>
        </div>
      )}

      <StepNavFooter onContinue={onContinue} onClose={onClose}>
        Nothing to save here — the structure comes from the designation.
      </StepNavFooter>
    </div>
  )
}

/** "12% of EPF wages", or the flat amount when PF is deducted at a fixed rate. */
function pfDetail(data: EmployeeWageStructure): string | undefined {
  if (!data.isPfActApplicable || data.pfDeductionAmount === null) return undefined
  const onLimit = data.isEmployeePfContributionOnWageLimit ? ' on wage ceiling' : ''
  return data.pfDeductionType.toLowerCase() === 'percentage'
    ? `${formatDecimal(data.pfDeductionAmount)}%${onLimit}`
    : `${formatAmount(data.pfDeductionAmount)}${onLimit}`
}

/** "As Per Act", or the hand-entered amount when the act is set manually. */
function actAmountDetail(actType: string, amount: number | null): string | undefined {
  if (!actType) return amount === null ? undefined : formatAmount(amount)
  if (actType.toLowerCase() === 'manual' && amount !== null) {
    return `Manual · ${formatAmount(amount)}`
  }
  return actType
}

/** One inherited value, drawn as a read-only tile rather than a disabled input. */
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
            {applicable ? (detail ?? 'Applicable') : 'Not applicable'}
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
  rows: EmployeeWageStructure['salaryComponents']
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
