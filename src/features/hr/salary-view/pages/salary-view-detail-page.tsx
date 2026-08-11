import type { ReactNode } from 'react'
import {
  ArrowLeft,
  Banknote,
  CalendarRange,
  IdCard,
  Landmark,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  UserRound,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { DetailItem } from '@/components/common/detail-item'
import { Forbidden, NotFound } from '@/features/error'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { formatAmount, formatDecimal } from '@/lib/currency'
import { cn, formatDate } from '@/lib/utils'
import { salaryMonthName } from '../constants'
import { useSalaryViewDetail } from '../hooks/use-salary-view-detail'
import { initialsOf } from '../lib/salary-view-mappers'
import type { SalaryViewHead, SalaryViewRow } from '../types'

/**
 * One processed salary, in full — the payslip behind a row of View Salary.
 *
 * Everything here is *stored*, not recomputed: the days, the wage, every head,
 * the five statutory figures and the act settings they were priced on. That last
 * part is why the statutory block shows the configuration and not just the
 * amounts — a back-dated month was owed at its own rates, and the designation's
 * wage structure may have been versioned since.
 *
 * The screen reads the row back through the report narrowed to one employee and
 * period (there is no `GET /salary/:id`), so the id, employee and period all
 * travel in the encrypted `?data=` token.
 */
export function SalaryViewDetailPage({ data }: { data?: string }) {
  const { isValidToken, row, query, goBack } = useSalaryViewDetail(data)

  // No usable token — nothing to show.
  if (!isValidToken) return <NotFound />

  if (isForbiddenError(query.error)) {
    return <Forbidden description={getApiErrorMessage(query.error)} />
  }

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  if (query.isError) {
    return (
      <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {getApiErrorMessage(query.error, "Couldn't load this salary.")}
      </p>
    )
  }

  /* The month may have been discarded from another tab since the list was read. */
  if (!row) return <NotFound />

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Salary Details
          </h1>
          <p className="text-sm text-muted-foreground">
            {salaryMonthName(row.month)} {row.year}
          </p>
        </div>

        <Button variant="outline" onClick={goBack}>
          <ArrowLeft className="size-4" />
          Back
        </Button>
      </div>

      {/* ── Who ── */}
      <Card className="bg-primary/4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-full bg-primary/10 text-base font-semibold uppercase text-primary">
              {initialsOf(row.employeeName)}
            </span>
            <div className="leading-tight">
              <h2 className="font-heading text-lg font-semibold">
                {row.employeeName || 'Unknown employee'}
              </h2>
              {row.designationName && (
                <p className="mt-0.5 text-xs uppercase tracking-wide text-muted-foreground">
                  {row.designationName}
                </p>
              )}
              {row.departmentName && (
                <p className="text-xs text-muted-foreground">{row.departmentName}</p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {row.employeeCode && <Chip>{row.employeeCode}</Chip>}
            {row.gender && <Chip>{row.gender}</Chip>}
            {row.maritalStatus && <Chip>{row.maritalStatus}</Chip>}
            <Badge variant={row.isPaid ? 'success' : 'warning'}>
              {row.isPaid ? 'Paid' : 'Unpaid'}
            </Badge>
            {row.isImported && <Badge variant="secondary">Imported</Badge>}
          </div>
        </div>
      </Card>

      {/* ── The four figures ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Figure icon={Banknote} label="Basic Pay" value={formatAmount(row.basicPay)} />
        <Figure
          icon={TrendingUp}
          label="Gross Pay"
          value={formatAmount(row.grossPay)}
          tone="success"
        />
        <Figure
          icon={TrendingDown}
          label="Total Deduction"
          value={formatAmount(row.totalDeduction)}
          tone="destructive"
        />
        <Figure
          icon={Wallet}
          label="Net Pay"
          value={formatAmount(row.netPay)}
          tone="primary"
        />
      </div>

      {/* ── Attendance & wages ── */}
      <Section icon={CalendarRange} title="Attendance & Wages">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Tile label="Working Days" value={formatDecimal(row.workingDays)} />
          <Tile label="Present Days" value={formatDecimal(row.presentDays)} />
          <Tile
            label="LWP Days"
            value={formatDecimal(row.lwpDays)}
            tone={row.lwpDays > 0 ? 'destructive' : undefined}
          />
          <Tile label="Wages / Day" value={formatAmount(row.wagesPerDay)} />
          <Tile
            label="Earned Basic"
            value={formatAmount(row.earnedBasic)}
            tone="success"
          />
          {row.extraDays > 0 && (
            <>
              <Tile label="Extra Days" value={formatDecimal(row.extraDays)} />
              <Tile
                label="Extra Days Amount"
                value={formatAmount(row.extraDaysAmount)}
              />
            </>
          )}
          {row.acts.isOvertimeApplicable && (
            <>
              <Tile label="OT Hours" value={formatDecimal(row.otHours)} />
              <Tile label="OT Amount" value={formatAmount(row.otAmount)} />
            </>
          )}
          {row.weeklyOff && <Tile label="Weekly Off" value={row.weeklyOff} />}
        </div>
      </Section>

      {/* ── The breakdown ──
          The five statutory figures sit above the catalog heads: PF, ESIC, PT,
          LWF and TDS are stored on the salary itself, not as pay components,
          and they are the lines a reader checks first.

          Every head the salary carries is listed, zero included — a head that
          paid nothing this month is part of what the designation configures, and
          its absence would read as "not applicable" rather than "came to
          nothing". Only the statutory five are filtered, since an act that never
          applied has no line to show at all. */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Section icon={TrendingUp} title="Allowances" tone="success">
          <Lines
            items={row.allowances.map((head) => ({
              label: labelOf(head),
              value: head.amount,
            }))}
            sign="+"
            totalLabel="Total Allowance"
            total={row.totalAllowance}
            tone="success"
            emptyMessage="No allowance was paid on this salary."
          />
        </Section>

        <Section icon={TrendingDown} title="Deductions" tone="destructive">
          <Lines
            items={[
              /* An act that never applied has no line at all — unlike a head,
                 which is configured on the designation and so belongs on the
                 ledger even at zero. */
              ...STATUTORY_LINES.map((line) => ({
                label: line.label,
                value: line.value(row),
              })).filter((line) => line.value !== 0),
              ...row.deductions.map((head) => ({
                label: labelOf(head),
                value: head.amount,
              })),
            ]}
            sign="−"
            totalLabel="Total Deduction"
            total={row.totalDeduction}
            tone="destructive"
            emptyMessage="Nothing was deducted from this salary."
          />
        </Section>
      </div>

      {/* ── The acts the month was priced on ── */}
      <Section icon={ShieldCheck} title="Statutory Applicability">
        <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
          <Applicability label="PF Act" value={row.acts.isPfActApplicable} />
          <Applicability label="ESIC Act" value={row.acts.isEsicActApplicable} />
          <Applicability label="PT Act" value={row.acts.isPtActApplicable} />
          <Applicability label="LWF Act" value={row.acts.isLwfActApplicable} />
          <Applicability label="TDS" value={row.acts.isTdsActApplicable} />
          <Applicability label="Overtime" value={row.acts.isOvertimeApplicable} />
          <DetailItem
            label="PF Deduction Type"
            value={row.acts.pfDeductionType}
          />
          <DetailItem
            label="PF Deduction Value"
            value={
              row.acts.pfDeductionAmount === null
                ? null
                : formatDecimal(row.acts.pfDeductionAmount)
            }
          />
          <DetailItem label="Employer PF" value={formatAmount(row.employerPf)} />
          <DetailItem label="ESIC Basis" value={row.acts.esicDeductionBasis} />
          <DetailItem
            label="Employee ESIC %"
            value={percent(row.acts.employeeEsicPercentage)}
          />
          <DetailItem
            label="Employer ESIC %"
            value={percent(row.acts.employerEsicPercentage)}
          />
          <DetailItem label="Employer ESIC" value={formatAmount(row.employerEsic)} />
          <DetailItem label="PT Act Type" value={row.acts.ptActType} />
          <DetailItem label="TDS %" value={percent(row.acts.tdsPercentage)} />
          <DetailItem
            label="OT Rate / Hour"
            value={
              row.acts.overtimeRatePerHour === null
                ? null
                : formatAmount(row.acts.overtimeRatePerHour)
            }
          />
        </div>
      </Section>

      {/* ── The person, and their statutory numbers ── */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Section icon={UserRound} title="Personal Info">
          <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <DetailItem label="Mobile" value={row.mobileNumber} />
            <DetailItem label="Email" value={row.email} />
            <DetailItem label="Gender" value={row.gender} />
            <DetailItem label="Date of Birth" value={onDate(row.birthDate)} />
            <DetailItem label="Marital Status" value={row.maritalStatus} />
            <DetailItem label="Relation" value={row.relation} />
            <DetailItem label="Relative Name" value={row.relativeName} />
            <DetailItem label="Aadhar No." value={row.aadharNumber} />
            <DetailItem label="Joining Date" value={onDate(row.joiningDate)} />
            <DetailItem label="Department" value={row.departmentName} />
          </div>
        </Section>

        <Section icon={IdCard} title="PF / ESIC Details">
          <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <DetailItem label="PF Number" value={row.pfNumber} />
            <DetailItem label="UAN Number" value={row.uanNumber} />
            <DetailItem label="ESIC Number" value={row.esicNumber} />
            <DetailItem label="Employee PF" value={formatAmount(row.employeePf)} />
            <DetailItem label="Employee ESIC" value={formatAmount(row.employeeEsic)} />
            <DetailItem label="Employee PT" value={formatAmount(row.employeePt)} />
          </div>
        </Section>
      </div>

      {/* ── Where the money went ── */}
      <Section icon={Landmark} title="Bank Details">
        <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
          <DetailItem label="Bank Name" value={row.bankName} />
          <DetailItem label="Account Number" value={row.bankAccountNumber} />
          <DetailItem label="Branch" value={row.bankBranchName} />
          <DetailItem label="IFSC Code" value={row.ifscCode} />
          <DetailItem label="Payment Status" value={row.isPaid ? 'Paid' : 'Unpaid'} />
          <DetailItem label="Payment Date" value={onDate(row.paymentDate)} />
        </div>
      </Section>
    </div>
  )
}

/* ── Pieces ─────────────────────────────────────────────────────────────── */

/** The five statutory deductions, in the order a payslip reads them. */
const STATUTORY_LINES: { label: string; value: (row: SalaryViewRow) => number }[] = [
  { label: 'PF', value: (row) => row.employeePf },
  { label: 'ESIC', value: (row) => row.employeeEsic },
  { label: 'Professional Tax', value: (row) => row.employeePt },
  { label: 'Labour Welfare Fund', value: (row) => row.employeeLwf },
  { label: 'TDS', value: (row) => row.employeeTds },
]

/** A head's full name, falling back to its code when it has none. */
function labelOf(head: SalaryViewHead): string {
  return head.name || head.code || 'Unnamed head'
}

/** An API date → what the screen shows; blank stays blank. */
function onDate(value: string): string | null {
  return value ? formatDate(value) : null
}

function percent(value: number | null): string | null {
  return value === null ? null : `${formatDecimal(value)}%`
}

const TONE: Record<string, string> = {
  success: 'text-success',
  destructive: 'text-destructive',
  primary: 'text-primary',
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-border/60 bg-card px-2.5 py-0.5 font-mono text-[11px] text-muted-foreground">
      {children}
    </span>
  )
}

/** One of the four headline figures. */
function Figure({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon
  label: string
  value: string
  tone?: 'success' | 'destructive' | 'primary'
}) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <span
        className={cn(
          'grid size-10 shrink-0 place-items-center rounded-lg bg-muted',
          tone && TONE[tone],
        )}
      >
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          className={cn(
            'mt-0.5 truncate font-heading text-xl font-semibold tabular-nums',
            tone && TONE[tone],
          )}
        >
          {value}
        </p>
      </div>
    </Card>
  )
}

/** A titled block — the same frame for every section of the payslip. */
function Section({
  icon: Icon,
  title,
  tone,
  children,
}: {
  icon: LucideIcon
  title: string
  tone?: 'success' | 'destructive'
  children: ReactNode
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2.5 border-b border-border/60 px-5 py-3">
        <span
          className={cn(
            'flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary',
            tone === 'success' && 'bg-success/12 text-success',
            tone === 'destructive' && 'bg-destructive/12 text-destructive',
          )}
        >
          <Icon className="size-4" />
        </span>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </Card>
  )
}

/** A single figure in the attendance strip. */
function Tile({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'success' | 'destructive'
}) {
  return (
    <div className="rounded-lg bg-muted/40 px-4 py-3 text-center">
      <p className={cn('font-heading text-xl font-semibold tabular-nums', tone && TONE[tone])}>
        {value}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

/** The allowance / deduction ledger — one line per head, then the total. */
function Lines({
  items,
  sign,
  totalLabel,
  total,
  tone,
  emptyMessage,
}: {
  items: { label: string; value: number }[]
  sign: '+' | '−'
  totalLabel: string
  total: number
  tone: 'success' | 'destructive'
  emptyMessage: string
}) {
  if (items.length === 0) {
    return <p className="py-2 text-sm text-muted-foreground">{emptyMessage}</p>
  }

  return (
    <dl className="text-sm">
      {/* No rule between the lines — a two-column ledger this short reads as
          rows without one, and the dividers only fence off figures that already
          line up. The one rule kept is above the total, which is a different
          kind of line. */}
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center justify-between gap-4 py-2"
        >
          <dt className="text-muted-foreground">{item.label}</dt>
          <dd className={cn('shrink-0 tabular-nums', TONE[tone])}>
            {sign} {formatAmount(item.value)}
          </dd>
        </div>
      ))}
      <div className="mt-2 flex items-center justify-between gap-4 border-t border-border pt-3">
        <dt className="font-semibold text-foreground">{totalLabel}</dt>
        <dd className={cn('shrink-0 font-semibold tabular-nums', TONE[tone])}>
          {formatAmount(total)}
        </dd>
      </div>
    </dl>
  )
}

/** Whether an act applied — `null` means the salary never recorded it. */
function Applicability({ label, value }: { label: string; value: boolean | null }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {value === null ? (
        <span className="text-xs text-muted-foreground">N/A</span>
      ) : (
        <Badge variant={value ? 'success' : 'secondary'}>{value ? 'Yes' : 'No'}</Badge>
      )}
    </div>
  )
}
